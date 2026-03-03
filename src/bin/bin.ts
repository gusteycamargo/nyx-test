#!/usr/bin/env node
import { program } from "commander";
import { copySkillsCommand } from "../commands/skills/copy-skills.js";

program.addCommand(copySkillsCommand);

await program.parseAsync(process.argv);
