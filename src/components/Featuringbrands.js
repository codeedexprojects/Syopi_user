import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom"; 
import toast from "react-hot-toast";
import "./FBrand.css";
import { BASE_URL } from "../services/baseUrl";
import { addWishlistApi, getWishlistApi, removefromWishlist } from "../services/allApi";

function Featuringbrands({ brands }) {
  const [products, setProducts] = useState(brands || []);
  const [wishlist, setWishlist] = useState(new Set());
  const [loadingWishlist, setLoadingWishlist] = useState({});
  const navigate = useNavigate(); 

  // Initialize products state when brands prop changes
  useEffect(() => {
    setProducts(brands || []);
  }, [brands]);

  // Fetch wishlist data on component mount
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const response = await getWishlistApi();
        
        if (response?.data?.wishlist) {
          setWishlist(
            new Set(
              response.data.wishlist.map((item) => String(item.productId._id))
            )
          );
        }
      } catch (error) {
        console.error("Failed to fetch wishlist:", error);
        // Don't show error toast on component mount as it might be due to no auth
        // User will see auth error when they try to add/remove items
      }
    };

    // Only fetch if user is logged in
    const token = localStorage.getItem("accessuserToken");
    if (token) {
      fetchWishlist();
    }
  }, []);

const toggleWishlist = async (id, event) => {
  event.stopPropagation();
  
  const token = localStorage.getItem("accessuserToken");
  
  if (!token) {
    toast.error("Please login to manage wishlist");
    navigate("/signin");
    return;
  }

  // Prevent multiple simultaneous requests for the same product
  if (loadingWishlist[id]) {
    return;
  }

  // Set loading state
  setLoadingWishlist(prev => ({
    ...prev,
    [id]: true
  }));

  const isCurrentlyWishlisted = wishlist.has(String(id));
  
  try {
    let response;
    
    // Show loading toast
    toast.loading(
      isCurrentlyWishlisted ? "Removing from wishlist..." : "Adding to wishlist...", 
      { id: 'wishlist-action' }
    );
    
    if (isCurrentlyWishlisted) {
      // If already wishlisted, remove from wishlist
      response = await removefromWishlist(id);
    } else {
      // Otherwise, add to wishlist
      response = await addWishlistApi(id);
    }

    // Check for authentication failure (401 or "Login Required." message)
    if (response?.message === "Login Required." || 
        response?.status === 401 || 
        response?.error?.includes("Login Required") ||
        response?.error?.includes("Unauthorized")) {
      
      toast.error("Session expired. Please login again", { id: 'wishlist-action' });
      
      // Clear invalid token
      localStorage.removeItem("accessuserToken");
      
      // Navigate to signin after showing toast
      setTimeout(() => {
        navigate("/signin");
      }, 1000);
      return;
    }

    if (!response.success) {
      console.error("Failed to toggle wishlist:", response.error);
      toast.error(response.error || "Failed to update wishlist", { id: 'wishlist-action' });
      return;
    }

    // Update the `isWishlisted` state in the products array
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product._id === id
          ? { ...product, isWishlisted: !product.isWishlisted }
          : product
      )
    );

    // Update local wishlist state
    setWishlist((prevWishlist) => {
      const updatedWishlist = new Set(prevWishlist);
      if (updatedWishlist.has(String(id))) {
        updatedWishlist.delete(String(id));
        toast.success("Removed from wishlist", { id: 'wishlist-action' });
      } else {
        updatedWishlist.add(String(id));
        toast.success("Added to wishlist", { id: 'wishlist-action' });
      }
      return updatedWishlist;
    });

  } catch (error) {
    console.error("Failed to toggle wishlist:", error);
    
    // Handle different types of errors
    if (error.message === "No token provided") {
      toast.error("Please login to manage wishlist", { id: 'wishlist-action' });
      localStorage.removeItem("accessuserToken");
      setTimeout(() => {
        navigate("/signin");
      }, 1000);
    } else if (error.response?.status === 401 || 
               error.message?.includes("401") || 
               error.message?.includes("Unauthorized") ||
               error.message?.includes("Login Required")) {
      toast.error("Session expired. Please login again", { id: 'wishlist-action' });
      localStorage.removeItem("accessuserToken");
      setTimeout(() => {
        navigate("/signin");
      }, 1000);
    } else if (error.message?.includes("Network") || error.code === 'NETWORK_ERROR') {
      toast.error("Network error. Please check your connection", { id: 'wishlist-action' });
    } else {
      toast.error("Failed to update wishlist. Please try again", { id: 'wishlist-action' });
    }
  } finally {
    // Clear loading state
    setLoadingWishlist(prev => ({
      ...prev,
      [id]: false
    }));
  }
};

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  // Helper function to get pricing from variants
  const getPricing = (product) => {
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      return {
        offerPrice: firstVariant.offerPrice,
        wholesalePrice: firstVariant.wholesalePrice
      };
    }
    // Fallback to product level pricing if no variants
    return {
      offerPrice: product.defaultOfferPrice || product.defaultPrice,
      wholesalePrice: product.defaultPrice
    };
  };

  const headingVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        delay: index * 0.2, 
      },
    }),
  };
  
  const truncateText = (text, maxLength = 25) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const { ref: headingRef, inView: headingInView } = useInView({
    threshold: 0.2,
  });

  const { ref: cardsRef, inView: cardsInView } = useInView({
    threshold: 0.2,
  });

  return (
    <div className="fbrand">
      <motion.p
        ref={headingRef}
        className="fbrandheading"
        initial="hidden"
        animate={headingInView ? "visible" : "hidden"}
        variants={headingVariants}
      >
        Featuring Brands Now
      </motion.p>

      <div className="feature-brand-card-row" ref={cardsRef}>
        {products.map((product, index) => {
          const pricing = getPricing(product);
          
          return (
            <motion.div
              className="feature-brand-card"
              key={product.id}
              custom={index}
              initial="hidden"
              animate={cardsInView ? "visible" : "hidden"}
              variants={cardVariants}
              onClick={() => handleProductClick(product._id)} 
              style={{ cursor: 'pointer' }} 
            >
              <div className="feature-card-brand-image-container">
                <img
                  src={`${BASE_URL}/uploads/${encodeURIComponent(
                    product.images[0]
                  )}`}
                  alt={product.title}
                  className="feature-brand-card-image"
                />
                <div
                  className={`brand-wishlist-icon ${
                    wishlist.has(String(product._id)) ? "active" : ""
                  } ${loadingWishlist[product._id] ? "loading" : ""}`}
                  onClick={(event) => toggleWishlist(product._id, event)} 
                  style={{ 
                    cursor: loadingWishlist[product._id] ? 'not-allowed' : 'pointer',
                    opacity: loadingWishlist[product._id] ? 0.6 : 1
                  }}
                >
                  {loadingWishlist[product._id] ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i
                      className={
                        wishlist.has(String(product._id))
                          ? "fa-solid fa-heart"
                          : "fa-regular fa-heart"
                      }
                    ></i>
                  )}
                </div>
              </div>
              <p className="feature-brand-card-title">
                {truncateText(product.name)}
              </p>
              <p className="feature-brand-card-description">
                {pricing.wholesalePrice && pricing.wholesalePrice !== pricing.offerPrice ? (
                  <span className="price-container">
                    <span className="original-price">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(pricing.wholesalePrice)}
                    </span>
                    <span className="offer-price">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(pricing.offerPrice)}
                    </span>
                  </span>
                ) : (
                  new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(pricing.offerPrice)
                )}
              </p>
            </motion.div>
          );
        })}
      </div>

      <button
        className="product-prev"
        type="button"
        data-bs-target="#homeCarousel"
        data-bs-slide="prev"
      >
        &#10094;
      </button>
      <button
        className="product-next"
        type="button"
        data-bs-target="#homeCarousel"
        data-bs-slide="next"
      >
        &#10095;
      </button>
    </div>
  );
}

export default Featuringbrands;