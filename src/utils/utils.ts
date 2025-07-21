export const getImageTitle = (imageSource: "capture" | "paste" | "upload") => {
  switch (imageSource) {
    case "paste":
      return "Pasted Image";
    case "upload":
      return "Uploaded Image";
    default:
      return "Screen Capture";
  }
};
