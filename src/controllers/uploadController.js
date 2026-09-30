import cloudinary, { cloudinaryIsConfigured } from "../config/cloudinary.js";

const dataUrlPattern = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;
const videoDataUrlPattern = /^data:video\/(mp4|webm|quicktime);base64,/i;

export async function uploadNewsImage(req, res, next) {
  try {
    const { imageData } = req.body;

    if (!cloudinaryIsConfigured()) {
      return res.status(503).json({ message: "Cloudinary is not configured on the server." });
    }
    if (typeof imageData !== "string" || !dataUrlPattern.test(imageData)) {
      return res.status(400).json({ message: "Please select a JPG, PNG, WebP, or GIF image." });
    }

    const result = await cloudinary.uploader.upload(imageData, {
      folder: "chinlung-today/news",
      resource_type: "image",
      transformation: [{ width: 1800, height: 1200, crop: "limit", quality: "auto" }],
    });

    res.status(201).json({ imageUrl: result.secure_url, imagePublicId: result.public_id });
  } catch (error) {
    next(error);
  }
}

export async function uploadPodcastVideo(req, res, next) {
  try {
    const { videoData } = req.body;

    if (!cloudinaryIsConfigured()) {
      return res.status(503).json({ message: "Cloudinary is not configured on the server." });
    }
    if (typeof videoData !== "string" || !videoDataUrlPattern.test(videoData)) {
      return res.status(400).json({ message: "Please select an MP4, WebM, or MOV video." });
    }

    const result = await cloudinary.uploader.upload(videoData, {
      folder: "chinlung-today/podcasts",
      resource_type: "video",
    });

    res.status(201).json({
      videoUrl: result.secure_url,
      videoPublicId: result.public_id,
      duration: result.duration || null,
    });
  } catch (error) {
    next(error);
  }
}
