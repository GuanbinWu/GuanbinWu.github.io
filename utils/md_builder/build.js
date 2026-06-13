const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt();

const blogDir = path.resolve(__dirname, "../../blog");
const outDir = path.resolve(__dirname, "../../pages");
const templatePath = path.resolve(__dirname, "template.html");
const indexTemplatePath = path.resolve(__dirname, "index_template.html");
const template = fs.readFileSync(templatePath, "utf-8");
const indexTemplate = fs.readFileSync(indexTemplatePath,"utf-8")

function extractTitle(mdText) {
  const match = mdText.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

// 读取 md
const files = fs.readdirSync(blogDir).filter(f => f.endsWith(".md"));

const indexItems = [];

files.forEach(file => {
  const name = file.replace(".md", "");
  const mdText = fs.readFileSync(path.join(blogDir, file), "utf-8");

  const title = extractTitle(mdText);
  const htmlContent = md.render(mdText);

  const finalHtml = template
    .replace("{{title}}", title)
    .replace("{{content}}", htmlContent);

  fs.writeFileSync(
    path.join(outDir, `${name}.html`),
    finalHtml
  );

  indexItems.push({ title, file: `${name}.html` });
});

const finalIndex = indexTemplate
    .replace("{{list}}", indexItems.map(i => `<li><a href="./pages/${i.file}">${i.title}</a></li>`).join("\n"))

fs.writeFileSync(
  path.resolve(__dirname, "../../index.html"),
  finalIndex
);