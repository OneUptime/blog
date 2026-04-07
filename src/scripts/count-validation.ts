import * as fs from "fs";
import * as path from "path";

const postsDir = path.join(__dirname, "../../posts");

const postDirs = fs
  .readdirSync(postsDir)
  .filter((name: string) =>
    fs.statSync(path.join(postsDir, name)).isDirectory()
  );

const totalPosts = postDirs.length;

let validated = 0;
let notValidated = 0;

for (const dir of postDirs) {
  const validationPath = path.join(postsDir, dir, "validation.json");
  if (fs.existsSync(validationPath)) {
    validated++;
  } else {
    notValidated++;
  }
}

console.log(`Total posts:      ${totalPosts}`);
console.log(`Validated:         ${validated}`);
console.log(`Need validation:   ${notValidated}`);
console.log(
  `Progress:          ${((validated / totalPosts) * 100).toFixed(2)}%`
);
