const fs = require('fs').promises;


const { loadFile, getReports } = require('./utils');
const getAsciiVersion = require('./getAsciiVersion');
const { getMappings, getLowerContractions, getAlphabeticContractions, getShortForms } = require('./loaders');


async function convert(fileName = '', lines = '', logLevel = '') {
  console.info(`File: ${fileName}`);
  console.info(`Lines: ${lines}`);

  const logAll = logLevel === 'all';
  const debug = logAll || logLevel === 'debug';
  const trace = logAll || logLevel === 'trace';
  const logProgress = logAll || logLevel === 'progress';

  const mappings = await getMappings();
  const alphaContractions = await getAlphabeticContractions();
  const lowerContractions = await getLowerContractions();
  const shortForms = await getShortForms();
  const fileContents = await loadFile(fileName);
  const isFormalBRF = fileName.toLowerCase().indexOf('.brf') >= 0;
  const options = {
    forceLowercaseOnInput: isFormalBRF,
    startLine: lines ? parseInt((lines.split('-')[0]), 10) || 0 : undefined,
    endLine: lines ? parseInt((lines.split('-')[1]), 10) || Infinity : undefined,
    debug,
    trace,
    logProgress
  };

  const asciiVersion = getAsciiVersion(
    options, 
    fileContents,
    mappings,
    alphaContractions,
    lowerContractions,
    shortForms
  );
  await fs.writeFile(`./output/${fileName}`, asciiVersion, "utf8");

  const reportArray = getReports();
  if (reportArray.length) {
    await fs.writeFile(`./output/${fileName}-report`, reportArray.join('\n'), "utf8");
    console.info(`${reportArray.length} warning(s)`);
  }
}

const inputFile = process.argv[2];
const lines = process.argv[3];
const logLevel = process.argv[4];
convert(inputFile, lines, logLevel);

module.exports = {
  convert
};

