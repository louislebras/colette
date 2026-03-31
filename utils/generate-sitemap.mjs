// utils/generate-sitemap.mjs
import fs from "fs";
import path from "path";
import xml from "xml";
import { baseUrl } from "../config/config-app.js";

const pagesDir = path.join(process.cwd(), "dist");

// ❌ Exclusion universelle : tout ce qui contient "404"
const is404 = (relativePath) => relativePath.includes("404");

// ❌ Dossiers exclus
const EXCLUDED_FOLDERS = ["modals"];

// ✅ Date SEO propre (YYYY-MM-DD)
const today = new Date().toISOString().split("T")[0];

// ✅ Récupération récursive de tous les index.html
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const isDirectory = fs.statSync(filePath).isDirectory();

    if (isDirectory) {
      const folderName = path.basename(filePath);
      if (!EXCLUDED_FOLDERS.includes(folderName)) {
        getFiles(filePath, fileList);
      }
      continue;
    }

    if (file !== "index.html") continue;

    const relativePath = filePath.replace(pagesDir, "").replace(/\\/g, "/");

    if (is404(relativePath)) continue;
    if (EXCLUDED_FOLDERS.some((f) => relativePath.startsWith(`/${f}/`)))
      continue;

    fileList.push(relativePath);
  }

  return fileList;
}

const files = getFiles(pagesDir);

// ✅ Génération des URLs avec règles SEO propres
const urlSet = new Set();
const urls = [];

files.forEach((file) => {
  const route = file.replace("/index.html", "");
  const fullUrl = `${baseUrl}${route}`;

  if (urlSet.has(fullUrl)) return;
  urlSet.add(fullUrl);

  let priority = 0.6;
  let changefreq = "monthly";

  // ✅ HOME
  if (route === "") {
    priority = 1.0;
    changefreq = "weekly";
  }

  // ✅ PAGES BUSINESS PRINCIPALES
  else if (
    route === "/expertises" ||
    route === "/colocations" ||
    route === "/optimhome" ||
    route === "/visites-virtuelles"
  ) {
    priority = 0.8;
    changefreq = "monthly";
  }

  // ✅ PAGES INFORMATIVES
  else if (
    route === "/about" ||
    route === "/contact" ||
    route === "/honoraires"
  ) {
    priority = 0.5;
    changefreq = "yearly";
  }

  // ✅ LÉGAL
  else if (route === "/mentions-legales") {
    priority = 0.2;
    changefreq = "yearly";
  }

  urls.push({
    loc: fullUrl,
    changefreq,
    priority,
    lastmod: today,
  });
});

// ✅ Tri SEO propre
urls.sort((a, b) => {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.loc.localeCompare(b.loc);
});

// ✅ Génération XML conforme Google
const sitemap = xml(
  [
    {
      urlset: [
        { _attr: { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" } },
        ...urls.map((url) => ({
          url: [
            { loc: url.loc },
            { changefreq: url.changefreq },
            { priority: url.priority.toFixed(1) },
            { lastmod: url.lastmod },
          ],
        })),
      ],
    },
  ],
  { declaration: true }
);

// ✅ Sauvegarde
fs.writeFileSync("sitemap.xml", sitemap);

console.log("✅ Sitemap SEO PRO généré correctement !");
