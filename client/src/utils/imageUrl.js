const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")) return imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}
