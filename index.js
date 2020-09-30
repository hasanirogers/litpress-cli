#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs');
const { execSync } = require('child_process');
const copyDir = require('copy-dir');
const rimraf = require('rimraf');
const template = require('./utilities/template');

const projectChoices = fs.readdirSync(`${__dirname}/projects`);

const questions = [
  {
    name: 'project-choice',
    type: 'list',
    message: 'Choose a project to generate.',
    choices: projectChoices
  },
  {
    name: 'local-wordpress-url',
    type: 'input',
    message: 'What is the full url to your local WordPress installation?',
    when: (answers) => isAusarAuset(answers)
  },
  {
    name: 'install-wordpress',
    type: 'list',
    message: 'Would you like to install WordPress now?',
    choices: ['yes', 'no'],
    when: (answers) => isAusarAuset(answers)
  },
  {
    name: 'local-wordpress-db-name',
    type: 'input',
    message: 'What is the name of your local WordPress database?',
    when: (answers) => isInstallWordPress(answers)
  },
  {
    name: 'local-wordpress-db-host',
    type: 'input',
    message: 'What is the ip address/hostname of your local WordPress database?',
    when: (answers) => isInstallWordPress(answers)
  },
  {
    name: 'local-wordpress-db-user',
    type: 'input',
    message: 'What username will you use to connect to your local WordPress database?',
    when: (answers) => isInstallWordPress(answers)
  },
  {
    name: 'local-wordpress-db-password',
    type: 'input',
    message: 'What password will you use to connect to your local WordPress database?',
    when: (answers) => isInstallWordPress(answers)
  }
];

const currentDir = process.cwd();

const createDirectoryContents = (templatePath, projectName, userAnswers) => {
  const filesToCreate = fs.readdirSync(templatePath);
  const projectChoice = userAnswers['project-choice'];
  const localWordPressURL = userAnswers['local-wordpress-url'];

  const settings = {
    projectName,
    projectChoice,
    localWordPressURL,
    localWordPressDB: {
      name: userAnswers['local-wordpress-db-name'],
      host: userAnswers['local-wordpress-db-host'],
      user: userAnswers['local-wordpress-db-user'],
      password: userAnswers['local-wordpress-db-password'],
    }
  }

  filesToCreate.forEach(file => {
    const originalFilePath = `${templatePath}/${file}`;
    const stats = fs.statSync(originalFilePath);

    if (stats.isFile()) {
      let contents = fs.readFileSync(originalFilePath, 'utf8');
      const writePath = `${currentDir}/${projectName}/${file}`;

      // read file content and transform it using template engine
      contents = template.render(contents, settings);

      // rename back to .gitignore
      if (file === '.npmignore') {
        file = '.gitignore';
      }

      // skip writing wp-config.php unless wordpress-install is yes
      if (file !== 'wp-config.php' || userAnswers['install-wordpress'] === 'yes') {
        fs.writeFileSync(writePath, contents, 'utf8');
      }
    } else if (stats.isDirectory()) {
      fs.mkdirSync(`${currentDir}/${projectName}/${file}`)

      // recursive call
      createDirectoryContents(`${templatePath}/${file}`, `${projectName}/${file}`);
    }
  });
}

const cleanUp = (projectName) => {
  rimraf.sync(`${currentDir}/${projectName}/.tmp`);
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

const isAusarAuset = (answers) => {
  if (
    answers['project-choice'] === 'ausar' ||
    answers['project-choice'] === 'auset'
  ) {
    return true;
  }

  return false;
}

const isInstallWordPress = (answers) => {
  if (answers['install-wordpress'] === 'yes') {
    return true;
  }

  return false;
}

const project = process.argv[2];
const isForce = process.argv[3] === '--force'

if (project) {
  if (validateProjectName(project)) {
    if (!fs.existsSync(`${currentDir}/${project}`) || isForce) {
      inquirer.prompt(questions)
        .then(answers => {
          const projectName = process.argv[2];
          const projectChoice = answers['project-choice'];
          const installWordPress = answers['install-wordpress'] === 'yes';
          const templatePath = `${__dirname}/projects/${projectChoice}`;

          // make installation dirs
          if(!fs.existsSync(`${currentDir}/${projectName}`)) {
            fs.mkdirSync(`${currentDir}/${projectName}`);
          }

          fs.mkdirSync(`${currentDir}/${projectName}/.tmp`);
          fs.mkdirSync(`${currentDir}/${projectName}/.tmp/wordpress`);
          fs.mkdirSync(`${currentDir}/${projectName}/.tmp/theme-files`);

          if (installWordPress) {
            console.log('Cloning WordPress...');

            execSync(`git clone git://github.com/WordPress/WordPress.git .`, {
              stdio: [0, 1, 2],
              cwd: `${currentDir}/${projectName}/.tmp/wordpress`
            });

            // remove version control, wp themes, & gitignore
            rimraf.sync(`${currentDir}/${projectName}/.tmp/wordpress/.git`);
            rimraf.sync(`${currentDir}/${projectName}/.tmp/wordpress/wp-content/themes`);
            rimraf.sync(`${currentDir}/${projectName}/.tmp/wordpress/.gitignore`)

            // copy wordpress to project dir
            copyDir.sync(`${currentDir}/${projectName}/.tmp/wordpress/`, `${currentDir}/${projectName}/`, { cover: true })
          }

          // grab the latest theme files
          console.log('Cloning theme...');

          execSync(`git clone https://github.com/hasanirogers/litpress-${projectChoice}.git .`, {
            stdio: [0, 1, 2],
            cwd: `${currentDir}/${projectName}/.tmp/theme-files`
          });

          // remove version control
          rimraf.sync(`${currentDir}/${projectName}/.tmp/theme-files/.git`);

          // copy theme-files to project dir
          copyDir.sync(`${currentDir}/${projectName}/.tmp/theme-files/`, `${currentDir}/${projectName}/`, { cover: true });

          // create directory contents from project templates
          createDirectoryContents(templatePath, projectName, answers);

          // install
          execSync(`npm install`, {
            stdio: [0, 1, 2],
            cwd: `${currentDir}/${projectName}`
          });

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
      console.error(`Use npx create ${project} --force to overwrite.` )
    }
  } else {
    console.error('Project name may only include letters, numbers, underscores and hashes.')
  }
} else {
  console.error('You must name your project.');
  console.log('Example: npx create [your-project-name]');
}
