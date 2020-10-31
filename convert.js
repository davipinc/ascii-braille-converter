const fs = require('fs').promises;

const brailleMapFile = `./mapping/braille-ascii.tsv`;

async function loadFile(fileName = '') {
    const data = await fs.readFile(`./sources/${fileName}`, "ascii");
    return data.toString();
}

// eslint-disable-next-line no-unused-vars
const ASCII_HEX = 0;
const ASCII_GLYPH = 1;
// eslint-disable-next-line no-unused-vars
const BRAILLE_DOTS = 2;
// eslint-disable-next-line no-unused-vars
const BRAILLE_GLYPH = 3;
// eslint-disable-next-line no-unused-vars
const UNICODE_BRAILLE = 4;
const BRAILLE_MEANING = 5;

const bracketedEffects = {
  '(space)': next => ` ${next}`,
  '(contraction)': next => `CONTRACTED: ${next}`,
  '(number prefix)': next => `NUM: ${next}`,
  '(uppercase prefix)': next => `${next.charAt(0).toUpperCase()}${next.substring(1)}`,
  '(italic prefix)': next => `<em>${next}</em>`
};

function getGlyphEffect(meaning) {
  if (typeof meaning !== 'string') {
    throw new Error('Glyph meaning must be a string');
  }
  const defaultFunction = () => `<!-- UNKNOWN: ${meaning} -->`;
  if (meaning.charAt(0) === '(') {
    return bracketedEffects.meaning || defaultFunction;
  }
  return meaning;
}

function arrayOfLines(fileString = '') {
  return fileString.split(/\r\n/);
}

function breakBySpaces(line = '') {
  return line.split(/ /);
}

async function getMappings() {
  const mappingTable = await fs.readFile(brailleMapFile, "utf8");
  const mappingsArray = arrayOfLines(mappingTable);
  const mappings = {
    chars: {},
    funcs: {}
  };

  mappingsArray.forEach( row => {
    const isBlankLine = row.replace(/\s/g, '') === '';
    if (isBlankLine) {
      return;
    }

    const cols = row.split(/\t/);
    const asciiGlyph = cols[ASCII_GLYPH];
    const meaning = cols[BRAILLE_MEANING];
    const effect = getGlyphEffect(meaning);
    
    if (typeof effect === 'string') {
      mappings.chars[asciiGlyph] = effect;
    } else {
      mappings.funcs[asciiGlyph] = effect;
    }
  });
  return mappings;
}

async function getAsciiVersion(string = '', mappings = {}) {
  const lines = arrayOfLines(string);

  function convertWord(word) {
    const translated = word.replace(/./g, match => {
      if (mappings.chars[match]) {
        if (mappings.chars[match] === match.toLowerCase()) {
          // this is just a simple A-Z but in lowercase
          return match;
        }
        return mappings.chars[match];
      }
      if (mappings.chars[match.toUpperCase()]) {
        // this is just a simple A-Z but in uppercase
        return match;
      }
      // console.warn(`No map for ${match}`);
      return match;
    });

    return translated;
  }

  function convertLine(line) {
    const words = breakBySpaces(line);
    const translatedLine = words.map(convertWord).join('\t');
  
    console.log(`INPUT:  ${words.join('\t')}`);
    console.log(`OUTPUT: ${translatedLine}`);

    return translatedLine;      
  }

  const translatedLines = lines.map(convertLine).join('');
  return translatedLines;
}
async function convert(fileName = '') {
  console.info(`File: ${fileName}`);
  const mappings = await getMappings();
  const fileContents = await loadFile(fileName);
  const asciiVersion = getAsciiVersion(fileContents, mappings);
  console.log(asciiVersion);
}

const inputFile = process.argv[2];
convert(inputFile);

module.exports = {
  getGlyphEffect,
  convert
};

