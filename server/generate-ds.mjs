import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { glob } from "glob";

// Chemins
const DESIGN_SYSTEM_PATH = path.resolve("design-system");
const COMPONENTS_PATH = path.join(DESIGN_SYSTEM_PATH, "components");
const LAYOUTS_PATH = path.join(DESIGN_SYSTEM_PATH, "layouts");
const TEMPLATES_PATH = path.join(DESIGN_SYSTEM_PATH, "templates");
const GUIDELINES_PATH = path.join(DESIGN_SYSTEM_PATH, "guidelines");
const ICONS_PATH = path.join(DESIGN_SYSTEM_PATH, "icons");
const ICONS_SOURCE_PATH = path.join(ICONS_PATH, "icons"); // Chemin du dossier icons/ dans design-system/icons/
const assets_PATH = path.resolve("assets"); // Chemin du dossier assets/ à la racine
const ICONS_DEST_PATH = path.join(assets_PATH, "icons"); // Chemin de destination : assets/icons/
const ALL_SCSS_PATH = path.join(DESIGN_SYSTEM_PATH, "all.scss");

// Étape 1 : Nettoyer les fichiers use.html existants
function cleanUseFiles() {
  console.log("Nettoyage des fichiers use.html...");
  const dirs = [COMPONENTS_PATH, LAYOUTS_PATH, TEMPLATES_PATH, ICONS_PATH];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    const useFiles = glob.sync("**/use.html", { cwd: dir });
    useFiles.forEach((file) => {
      const filePath = path.join(dir, file);
      fs.unlinkSync(filePath);
      console.log(`Supprimé : ${filePath}`);
    });
  });
}

// Étape 2 : Extraire les placeholders du contenu HTML
function extractPlaceholders(html) {
  const placeholderRegex = /\[([^\]]+)\]/g;
  const placeholders = new Set();
  let match;
  while ((match = placeholderRegex.exec(html)) !== null) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

// Étape 3 : Générer use.html à partir de index.html pour les composants, layouts et templates
function generateUseFile(indexPath, outputPath) {
  const html = fs.readFileSync(indexPath, "utf8");

  // Utiliser JSDOM pour parser le HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Extraire la balise racine
  const rootElement = document.body.firstElementChild;
  if (!rootElement) {
    console.warn(`Aucune balise racine trouvée dans ${indexPath}`);
    return;
  }

  const tagName = rootElement.tagName.toLowerCase();
  const className = rootElement.className || "";

  // Extraire les placeholders
  const placeholders = extractPlaceholders(html);

  // Générer le contenu de use.html
  const useContent = `
<${tagName}${className ? ` class="${className}"` : ""}>
${placeholders.map((p) => `  [${p}]: "";`).join("\n")}
</${tagName}>
  `.trim();

  fs.writeFileSync(outputPath, useContent, "utf8");
  console.log(`Généré : ${outputPath}`);
}

// Étape 4 : Générer use.html pour les icônes
function generateIconsUseFile() {
  const indexPath = path.join(ICONS_PATH, "index.html");
  const outputPath = path.join(ICONS_PATH, "use.html");

  if (!fs.existsSync(indexPath)) {
    console.warn(
      `Fichier ${indexPath} introuvable, génération de use.html pour les icônes ignorée.`
    );
    return;
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Trouver toutes les balises <img> dans la bibliothèque d'icônes
  const iconElements = document.querySelectorAll(".icon-library img");
  if (iconElements.length === 0) {
    console.warn(`Aucune icône trouvée dans ${indexPath}`);
    return;
  }

  // Générer le contenu de use.html pour les icônes
  const useContent = Array.from(iconElements)
    .map((img) => {
      const className = img.className;
      if (!className) return null;
      return `[${className}]: <img class="${className}">`;
    })
    .filter(Boolean)
    .join("\n");

  if (useContent) {
    fs.writeFileSync(outputPath, useContent, "utf8");
    console.log(`Généré : ${outputPath}`);
  } else {
    console.warn(
      `Aucune icône valide trouvée dans ${indexPath}, use.html non généré.`
    );
  }
}

// Étape 5 : Copier le dossier design-system/icons/icons/ vers assets/icons/
function copyIconsToassets() {
  console.log("Copie du dossier icons vers assets/icons...");

  // Vérifier si le dossier source existe
  if (!fs.existsSync(ICONS_SOURCE_PATH)) {
    console.warn(
      `Dossier ${ICONS_SOURCE_PATH} introuvable, copie des icônes ignorée.`
    );
    return;
  }

  // Créer le dossier de destination s'il n'existe pas
  if (!fs.existsSync(assets_PATH)) {
    fs.mkdirSync(assets_PATH, { recursive: true });
    console.log(`Dossier créé : ${assets_PATH}`);
  }

  // Copier le dossier icons/ vers assets/icons/
  fs.cpSync(ICONS_SOURCE_PATH, ICONS_DEST_PATH, { recursive: true });
  console.log(`Copié : ${ICONS_SOURCE_PATH} -> ${ICONS_DEST_PATH}`);
}

// Étape 6 : Traiter tous les fichiers index.html pour les composants, layouts et templates
function processDesignSystem() {
  cleanUseFiles();

  // Traiter les components, layouts et templates
  const paths = [
    { dir: COMPONENTS_PATH, name: "components" },
    { dir: LAYOUTS_PATH, name: "layouts" },
    { dir: TEMPLATES_PATH, name: "templates" },
  ];

  paths.forEach(({ dir, name }) => {
    if (!fs.existsSync(dir)) return;
    const indexFiles = glob.sync("**/index.html", { cwd: dir });
    indexFiles.forEach((file) => {
      const indexPath = path.join(dir, file);
      const usePath = path.join(dir, path.dirname(file), "use.html");
      generateUseFile(indexPath, usePath);
    });
  });

  // Traiter les icônes
  generateIconsUseFile();

  // Copier les icônes vers assets/
  copyIconsToassets();
}

// Étape 7 : Générer all.scss en concaténant tous les fichiers SCSS
function generateAllScss() {
  console.log("Génération de all.scss...");

  // Liste des dossiers à parcourir pour trouver les fichiers SCSS
  const dirs = [
    { dir: GUIDELINES_PATH, name: "guidelines" },
    { dir: COMPONENTS_PATH, name: "components" },
    { dir: LAYOUTS_PATH, name: "layouts" },
    { dir: TEMPLATES_PATH, name: "templates" },
    { dir: ICONS_PATH, name: "icons" },
  ];

  // Collecter tous les fichiers SCSS
  let allScssContent = [];
  // Ajouter le contenu de colors.scss en premier
  const colorsScssPath = path.join(GUIDELINES_PATH, "colors.scss");
  if (fs.existsSync(colorsScssPath)) {
    const colorsContent = fs.readFileSync(colorsScssPath, "utf8").trim();
    allScssContent.push(colorsContent);
    console.log(`Ajouté contenu SCSS de : ${colorsScssPath}`);
  } else {
    console.warn(`Fichier ${colorsScssPath} introuvable, contenu ignoré.`);
  }

  dirs.forEach(({ dir, name }) => {
    if (!fs.existsSync(dir)) {
      console.warn(`Dossier ${name} introuvable, ignoré.`);
      return;
    }

    // Trouver tous les fichiers SCSS (par exemple, index.scss)
    const scssFiles = glob.sync("**/index.scss", { cwd: dir });
    scssFiles.forEach((file) => {
      const scssPath = path.join(dir, file);
      const scssContent = fs.readFileSync(scssPath, "utf8").trim();
      if (scssContent) {
        allScssContent.push(scssContent);
        console.log(`Ajouté SCSS de : ${scssPath}`);
      }
    });
  });

  // Écrire le contenu concaténé dans all.scss
  if (allScssContent.length > 0) {
    const finalContent = allScssContent.join("\n\n"); // Ajoute deux nouvelles lignes entre chaque fichier
    fs.writeFileSync(ALL_SCSS_PATH, finalContent, "utf8");
    console.log(`Généré : ${ALL_SCSS_PATH}`);
  } else {
    console.warn("Aucun fichier SCSS trouvé, all.scss n'a pas été modifié.");
  }
}

// Étape 8 : Exécuter le script
async function main() {
  console.log("Génération du Design System...");
  if (!fs.existsSync(DESIGN_SYSTEM_PATH)) {
    console.error("Répertoire design-system/ introuvable !");
    process.exit(1);
  }

  // Générer les fichiers use.html et copier les icônes
  processDesignSystem();

  // Générer all.scss
  generateAllScss();

  console.log("Génération terminée !");
}

main();
