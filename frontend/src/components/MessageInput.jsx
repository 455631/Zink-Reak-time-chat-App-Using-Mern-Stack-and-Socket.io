import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image as ImageIcon, Send, X } from "lucide-react";
import toast from "react-hot-toast";

// Image compressor utility
const compressImage = (file, maxSizeMB = 1, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // Convert MB to bytes for comparison
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // If file is already smaller than max size, resolve with the file
    if (file.size <= maxSizeBytes) {
      resolve(file);
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image(); // Use window.Image to avoid conflicts
      img.src = event.target.result;
      
      img.onload = () => {
        // Calculate dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        const maxDim = 1200; // Maximum dimension for either width or height
        
        if (width > height && width > maxDim) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width * maxDim) / height;
          height = maxDim;
        }
        
        // Create canvas and resize
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with high quality
        let currentQuality = quality;
        
        // Convert to blob and check size
        const processCanvasToBlob = (q) => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeBytes) {
              // Size is good, convert to file and resolve
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else if (q > 0.1) {
              // Still too large, try with lower quality
              currentQuality = q - 0.1;
              processCanvasToBlob(currentQuality);
            } else {
              // We've tried our best, warn the user
              toast.error(`Could not compress image below ${maxSizeMB}MB. Please use a smaller image.`);
              reject(new Error("Image too large even after compression"));
            }
          }, "image/jpeg", q);
        };
        
        // Start compression process
        processCanvasToBlob(currentQuality);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [sendingImage, setSendingImage] = useState(null); // New state for buffer effect
  const fileInputRef = useRef(null);
  const { sendMessage, addPendingMessage } = useChatStore(); // Assuming addPendingMessage exists

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    // Check file size
    const maxSizeMB = 1;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    try {
      setIsCompressing(true);
      
      // If file is too large, compress it
      let processedFile = file;
      if (file.size > maxSizeBytes) {
        processedFile = await compressImage(file, maxSizeMB);
      }
      
      // Read file for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setIsCompressing(false);
      };
      reader.readAsDataURL(processedFile);
      
    } catch (error) {
      setIsCompressing(false);
      toast.dismiss();
      console.error("Error processing image:", error);
      fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !imagePreview) || isSubmitting || isCompressing) return;

    setIsSubmitting(true);
    
    try {
      // Create message payload
      const messageData = {
        text: text.trim()
      };
      
      // If there's an image, show buffer effect
      if (imagePreview) {
        messageData.image = imagePreview;
        setSendingImage(imagePreview); // Set buffer image
        
        // Add pending message to chat (for immediate UI feedback)
        const pendingMessageId = Date.now().toString();
        if (addPendingMessage) {
          addPendingMessage({
            id: pendingMessageId,
            text: text.trim(),
            image: imagePreview,
            isPending: true,
            timestamp: new Date()
          });
        }
        
        // Clear form immediately for better UX
        setText("");
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      
      await sendMessage(messageData);

      // Clear sending image after successful send
      setSendingImage(null);
      
      // If no image, clear form here
      if (!messageData.image) {
        setText("");
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
      setSendingImage(null); // Clear sending image on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-t border-base-300 bg-base-200">
      {/* Image preview before sending */}
      {imagePreview && (
        <div className="relative w-24 h-24 mb-2">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-error hover:bg-error/80 rounded-full p-1 text-error-content transition-colors"
            aria-label="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Buffer effect - show sending image with loading overlay */}
      {sendingImage && (
        <div className="relative w-24 h-24 mb-2 opacity-70">
          <img
            src={sendingImage}
            alt="Sending..."
            className="w-full h-full object-cover rounded-lg"
          />
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-base-content/40 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-base-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
          {/* Optional progress text */}
          <div className="absolute -bottom-5 left-0 text-xs text-base-content/60">
            Sending...
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="input input-bordered flex-1 bg-base-100 text-base-content placeholder:text-base-content/50 focus:border-primary"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting || isCompressing}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
          disabled={isSubmitting || isCompressing}
        />
        <button
          type="button"
          className={`btn btn-circle btn-ghost hidden sm:flex ${
            imagePreview ? "text-success" : "text-base-content/40"
          }`}
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting || isCompressing}
          aria-label="Attach image"
        >
          <ImageIcon size={20} />
        </button>
        <button
          type="submit"
          className={`btn btn-primary ${isSubmitting || isCompressing ? 'btn-disabled' : ''}`}
          disabled={isSubmitting || isCompressing || (!text.trim() && !imagePreview)}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </form>
      
      {isCompressing && (
        <p className="text-xs text-base-content/60 mt-1">Compressing image...</p>
      )}
    </div>
  );
};

export default MessageInput;