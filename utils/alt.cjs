// INSTRUCTIONS
// TO RUN THE SCRIPT : enter this in the terminal : "node alt.cjs"

const fs = require("fs");
const path = require("path");

// Chemins des répertoires
const directories = ["app", "dist"];

function getFiles(dir, files_ = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else if (name.endsWith(".html")) {
      files_.push(name);
    }
  }
  return files_;
}

function generateAltText(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  return baseName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function updateAltTags(file) {
  let content = fs.readFileSync(file, "utf8");
  const regex = /<img [^>]*src="([^"]+)"[^>]*>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const imgSrc = match[1];
    const altText = generateAltText(imgSrc);
    const newImgTag = match[0].includes("alt=")
      ? match[0].replace(/alt="[^"]*"/, `alt="${altText}"`)
      : match[0].replace("<img", `<img alt="${altText}"`);
    content = content.replace(match[0], newImgTag);
  }
  fs.writeFileSync(file, content, "utf8");
}

// Parcourt les dossiers spécifiés et met à jour les balises ALT
directories.forEach((dir) => {
  const files = getFiles(dir);
  files.forEach((file) => updateAltTags(file));
});

console.log("ALT tags updated successfully!");

// INSTRUCTIONS
// TO RUN THE SCRIPT : enter this in the terminal : node alt.cjs
