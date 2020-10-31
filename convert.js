const fs = require('fs').promises;
const { ASCII_GLYPH, BRAILLE_MEANING } = require('./mapping/braille-ascii-columns.js');
const {
  LOWERCASE_LETTER, STANDING_ALONE, WITH_DOTS_5, WITH_DOTS_45, WITH_DOTS_456, WITH_DOTS_46, WITH_DOTS_56
} = require('./mapping/alphabetic-contractions-columns.js');

const brailleMapFile = `./mapping/braille-ascii.tsv`;
const alphabeticContractionsFile = `./mapping/alphabetic-contractions.tsv`;

async function loadFile(fileName = '') {
    const data = await fs.readFile(`./sources/${fileName}`, "ascii");
    return data.toString();
}

const bracketedEffects = {
  '(space)': word => ` ${word}`,
  '(contraction)': word => `CONTRACTED: ${word}`,
  '(number prefix)': word => `NUM: ${word}`,
  '(uppercase prefix)': word => `${word.charAt(0).toUpperCase()}${word.substring(1)}`,
  '(italic prefix)': word => `<em>${word}</em>`,
  '(letter prefix)': word => word
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

async function getContractions() {
  const contractionsTable = await fs.readFile(alphabeticContractionsFile, "utf8");
  
  const contractionsArray = arrayOfLines(contractionsTable);
  const contractions = {
    alone: {},
    dots_5: {},
    dots_45: {},
    dots_456: {},
    dots_46: {},
    dots_56: {}
  };

  function valid(string = '') {
    if (string === '…') return false;
    return Boolean(string);
  }

  contractionsArray.forEach( row => {
    const isBlankLine = row.replace(/\s/g, '') === '';
    if (isBlankLine) {
      return;
    }

    const cols = row.split(/\t/);
    const letter = cols[LOWERCASE_LETTER];

    if (valid(cols[STANDING_ALONE])) contractions.alone[letter] = cols[STANDING_ALONE];
    if (valid(cols[WITH_DOTS_5])) contractions.dots_5[letter] = cols[WITH_DOTS_5];
    if (valid(cols[WITH_DOTS_45])) contractions.dots_45[letter] = cols[WITH_DOTS_45];
    if (valid(cols[WITH_DOTS_456])) contractions.dots_456[letter] = cols[WITH_DOTS_456];
    if (valid(cols[WITH_DOTS_46])) contractions.dots_46[letter] = cols[WITH_DOTS_46];
    if (valid(cols[WITH_DOTS_56])) contractions.dots_56[letter] = cols[WITH_DOTS_56];
  });
  console.info(contractions);
  return contractions;
}

function getAsciiVersion(string = '', mappings = {}, contractions = {}) {
  const lines = arrayOfLines(string);

  function translateLetters(word) {
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
      return match;
    });

    return translated;
  }

  const dotTypes = {
    '"': 'dots_5',
    '^': 'dots_45',
    ';': 'dots_56',
    '_': 'dots_456'
  };

  function getSuffixLetters(suffixCharacter = '', suffixLetter = '') {
    const dotType = dotTypes[suffixCharacter];
    return contractions[dotType][suffixLetter].replace(/^-/, '') || '??';
  }

  function handlePrefixes(word = '') {
    return word.replace(/\b(.+?)([.;])(.+?)\b/g, (match, prefix, suffixCharacter, suffix) => {
      return `${prefix}${getSuffixLetters(suffixCharacter, suffix)}`;
    });
  }

  function addSingleLetterContractions(word = '') {
    if (contractions.alone[word]) return contractions.alone[word];
    return word;
  }

  function convertLine(line) {
    const words = breakBySpaces(line);
    const wordsWithLettersTranslated = words.map(translateLetters);
  
    // console.log(`INPUT:  ${words.join('\t')}`);
    // console.log(`OUTPUT: ${wordsWithLettersTranslated.join('\t')}`);

    const wordsWithPrefixesTranslated = wordsWithLettersTranslated.map(handlePrefixes);

    // console.log(`INPUT:  ${wordsWithLettersTranslated.join('\t')}`);
    // console.log(`OUTPUT: ${wordsWithPrefixesTranslated.join('\t')}`);

    const wordsWithSingleLetterContractions = wordsWithPrefixesTranslated.map(addSingleLetterContractions);

    // console.log(`INPUT:  ${wordsWithPrefixesTranslated.join('\t')}`);
    // console.log(`OUTPUT: ${wordsWithSingleLetterContractions.join('\t')}`);

    return wordsWithSingleLetterContractions.join(' ');      
  }

  const translatedLines = lines.map(convertLine).join('\n');
  return translatedLines;
}
async function convert(fileName = '') {
  console.info(`File: ${fileName}`);
  const mappings = await getMappings();
  const contractions = await getContractions();
  const fileContents = await loadFile(fileName);
  const asciiVersion = getAsciiVersion(fileContents, mappings, contractions);
  console.log(asciiVersion);
}

const inputFile = process.argv[2];
convert(inputFile);

module.exports = {
  getGlyphEffect,
  convert
};

