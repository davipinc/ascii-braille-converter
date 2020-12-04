const fs = require('fs').promises;

function arrayOfLines(fileString = '') {
  return fileString.split(/\r\n/);
}

async function loadFile(fileName = '') {
  const data = await fs.readFile(`./sources/${fileName}`, "ascii");
  return data.toString();
}

const reportArray = [];

function report(string = '') {
  reportArray.push(string);
}

function getReports() {
  return reportArray;
}

module.exports = {
  arrayOfLines,
  loadFile,
  report,
  getReports
};