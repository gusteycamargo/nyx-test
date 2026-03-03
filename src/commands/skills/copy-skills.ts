import { Command } from "commander";
import path from "node:path";
import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";

interface CopySkillsOptions {
  skillsPath: string;
}

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const copySkillsCommand = new Command("copy-skills")
  .description("Copy skills from a package to the current package")
  .option("--skills-path <skills-path>", "The path where skills will be placed")
  .action(async (options: CopySkillsOptions) => {
    const commandFilePath = fileURLToPath(import.meta.url);
    const packageRootPath = path.resolve(
      path.dirname(commandFilePath),
      "../../../",
    );
    const sourcePathCandidates = [
      path.join(packageRootPath, ".ai", "skills"),
      path.join(packageRootPath, "dist", ".ai", "skills"),
    ];
    const sourcePath = (
      await Promise.all(
        sourcePathCandidates.map(async (candidatePath) =>
          (await pathExists(candidatePath)) ? candidatePath : undefined,
        ),
      )
    ).find((candidatePath) => candidatePath !== undefined);

    if (!sourcePath) {
      throw new Error(
        `Could not find skills source directory. Tried: ${sourcePathCandidates.join(", ")}`,
      );
    }

    const providedSkillsPath = `${options.skillsPath}/skills`;
    const skillsPath = path.resolve(process.cwd(), providedSkillsPath);
    const skills = await readdir(sourcePath);

    await mkdir(skillsPath, { recursive: true });

    for (const skill of skills) {
      const sourceSkillPath = path.join(sourcePath, skill);
      const targetSkillPath = path.join(skillsPath, skill);

      await cp(sourceSkillPath, targetSkillPath, {
        recursive: true,
      });

      const skillFilePath = path.join(targetSkillPath, "SKILL.md");
      try {
        const skillContent = await readFile(skillFilePath, "utf-8");
        const updatedSkillContent = skillContent.replaceAll(
          "<PATH>",
          providedSkillsPath,
        );
        await writeFile(skillFilePath, updatedSkillContent, "utf-8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    }
  });
