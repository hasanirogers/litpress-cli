#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs');
const { execSync } = require('child_process');
const rimraf = require("rimraf");
const template = require("./utilities/template");

const choices = fs.readdirSync(`${__dirname}/projects`);

const questions = [
  {
    name: 'project-choice',
    type: 'list',
    message: 'Choose a project to generate.',
    choices: choices
  },
  {
    name: 'local-wordpress-url',
    type: 'input',
    message: 'What is the full url to your local WordPress installation?',
    when: (answers) => {
      if (answers['project-choice'] === 'ausar') {
        return true;
      }

      return false;
    }
  }
];

const currentDir = process.cwd();

const createDirectoryContents = (templatePath, projectName) => {
  const filesToCreate = fs.readdirSync(templatePath);

  filesToCreate.forEach(file => {
    const originalFilePath = `${templatePath}/${file}`;
    const stats = fs.statSync(originalFilePath);

    if (stats.isFile()) {
      let contents = fs.readFileSync(originalFilePath, 'utf8');
      const writePath = `${currentDir}/${projectName}/${file}`;

      // read file content and transform it using template engine
      contents = template.render(contents, { projectName });

      // rename back to .gitignore
      if (file === '.npmignore') file = '.gitignore';

      fs.writeFileSync(writePath, contents, 'utf8');
    } else if (stats.isDirectory()) {
      fs.mkdirSync(`${currentDir}/${projectName}/${file}`)

      // recursive call
      createDirectoryContents(`${templatePath}/${file}`, `${projectName}/${file}`);
    }
  });
}

const cleanUp = (projectName) => {
  rimraf.sync(`${currentDir}/${projectName}/.git`);
}

const finishLogs = (projectName) => {
  console.log(`${projectName} was created.`);
  console.log('Run the following commands to start!');
  console.log('------------------------------------');
  console.log(`cd ${projectName}`);
  console.log('npm start');
}

const validateProjectName = (projectName) => {
  const isValid = /^([A-Za-z\-\_\d])+$/.test(projectName);

  return isValid;
}

const project = process.argv[2];

if (project) {
  if (validateProjectName(project)) {
    if (!fs.existsSync(`${currentDir}/${project}`)) {
      inquirer.prompt(questions)
        .then(answers => {
          const projectName = process.argv[2];
          const projectChoice = answers['project-choice'];
          const localWordPressURL = answers['local-wordpress-url']
          const templatePath = `${__dirname}/projects/${projectChoice}`;

          fs.mkdirSync(`${currentDir}/${projectName}`);

          // execSync(`git clone git://github.com/WordPress/WordPress.git .`, {
          //   stdio: [0, 1, 2],
          //   cwd: `${currentDir}/${projectName}`
          // })

          createDirectoryContents(templatePath, projectName);

          return projectName;

        })
        .then(projectName => {
          cleanUp(projectName);
          finishLogs(projectName);
        })
        .catch(error => {
          console.error(error);
        });
    } else {
      console.error(`A directory named ${project} already exists!`);
    }
  } else {
    console.error('Project name may only include letters, numbers, underscores and hashes.')
  }
} else {
  console.error('You must name your project.');
  console.log('Example: npx create [your-project-name]');
}
