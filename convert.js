const fs = require('fs').promises;


const { loadFile, getReports } = require('./utils');
const getAsciiVersion = require('./getAsciiVersion');
const { getBrailleMappings, getBrailleOnlyContractions, getLowerContractions, getAlphabeticContractions, getShortForms } = require('./loaders');


async function convert(fileName = '', lines = '', logLevel = '') {
  console.info(`File: ${fileName}`);
  console.info(`Lines: ${lines}`);

  const logAll = logLevel === 'all';
  const debug = logAll || logLevel === 'debug';
  const trace = logAll || logLevel === 'trace';
  const logProgress = logAll || logLevel === 'progress';

  const mappings = await getBrailleMappings();
  const brailleOnlyContractions = await getBrailleOnlyContractions();
  const alphaContractions = await getAlphabeticContractions();
  const lowerContractions = await getLowerContractions();
  const shortForms = await getShortForms();
  const fileContents = await loadFile(fileName);
  const isFormalBRF = fileName.toLowerCase().indexOf('.brf') >= 0;
  const baseName = fileName.replace(/\.brf$/i, '');

  let startLine;
  let endLine;
  let filePart = '';
  const startEndReg = /^([0-9]+)-([0-9]+)$/;
  const singleLineReg = /^([0-9]+)$/;

  if (lines.match(startEndReg)) {
    startLine = parseInt(lines.replace(startEndReg, '$1'), 10);
    endLine = parseInt(lines.replace(startEndReg, '$2'), 10);
    filePart = `__range`;
    console.info('Range mode:', startLine, endLine);
  } else if (lines.match(singleLineReg)) {
    startLine = parseInt(lines, 10);
    endLine = startLine + 1;
    filePart = `__line`;
    console.info('Single line mode', startLine);
  } else {
    startLine = 1;
    endLine = Infinity;   
    filePart = '';
    console.info('Document mode');
  }

  const options = {
    forceLowercaseOnInput: isFormalBRF,
    startLine,
    endLine,
    debug,
    trace,
    logProgress
  };

  const asciiVersion = getAsciiVersion(
    options, 
    fileContents,
    mappings,
    brailleOnlyContractions,
    alphaContractions,
    lowerContractions,
    shortForms
  );

  await fs.writeFile(`./output/${baseName}${filePart}.brf`, asciiVersion, "utf8");

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

