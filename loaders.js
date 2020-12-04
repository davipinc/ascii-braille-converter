const fs = require('fs').promises;

const { arrayOfLines } = require('./utils');

const {
  LONGFORM, SHORTFORM
} = require('./mapping/shortforms');

const { ASCII_GLYPH, BRAILLE_MEANING } = require('./mapping/braille-ascii-columns.js');
const {
  LOWERCASE_LETTER, STANDING_ALONE, WITH_DOTS_5, WITH_DOTS_45, WITH_DOTS_456, WITH_DOTS_46, WITH_DOTS_56
} = require('./mapping/alphabetic-contractions-columns.js');
const {
  LOWER_ASCII, LOWER_ALONE, LOWER_START, LOWER_MIDDLE, LOWER_END
} = require('./mapping/lower-contractions-columns.js');

const brailleMapFile = `./mapping/braille-ascii.tsv`;
const alphabeticContractionsFile = `./mapping/alphabetic-contractions.tsv`;
const lowerContractionsFile = `./mapping/lower-contractions.tsv`;
const shortFormsFile = `./mapping/shortforms.tsv`;

function getGlyphEffect(meaning) {
  if (typeof meaning !== 'string') {
    throw new Error('Glyph meaning must be a string');
  }
  if (meaning.charAt(0) === '(') {
    return null;
  }
  return meaning;
}

function removeBrackets(string) {
  return string.replace(/[()]/g, '');
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
    }
  });
  return mappings;
}

async function getAlphabeticContractions() {
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

  // TODO: break words with punctuation into two e.g. x'll
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
  // console.info(contractions);
  return contractions;
}

async function getLowerContractions() {
  const contractionsTable = await fs.readFile(lowerContractionsFile, "utf8");
  
  const contractionsArray = arrayOfLines(contractionsTable);
  const contractions = {
    alone: {},
    start: {},
    middle: {},
    end: {}
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
    const letter = cols[LOWER_ASCII];
    if (valid(cols[LOWER_ALONE])) contractions.alone[letter] = cols[LOWER_ALONE];
    if (valid(cols[LOWER_START])) contractions.start[letter] = cols[LOWER_START];
    if (valid(cols[LOWER_MIDDLE])) contractions.middle[letter] = cols[LOWER_MIDDLE];
    if (valid(cols[LOWER_END])) contractions.end[letter] = cols[LOWER_END];
  });
  // console.info(contractions);
  return contractions;
}


async function getShortForms() {
  const shortFormsTable = await fs.readFile(shortFormsFile, "utf8");
  
  const shortFormsArray = arrayOfLines(shortFormsTable);
  const shortForms = {};
  function longestToShortest(shortFormObjectA, shortFormObjectB) {
    const colsA = shortFormObjectA.split(/\t/);
    const colsB = shortFormObjectB.split(/\t/);
    const shortFormA = removeBrackets(colsA[SHORTFORM]);
    const shortFormB = removeBrackets(colsB[SHORTFORM]);
    return shortFormA.length > shortFormB.length ? -1 : 1;
  }

  // order by length so "acr" is used in preference to "ac", for example
  shortFormsArray.sort(longestToShortest);

  shortFormsArray.map( row => {
    const isBlankLine = row.replace(/\s/g, '') === '';
    if (isBlankLine) {
      return;
    }    
    const cols = row.split(/\t/);
    const shortForm = removeBrackets(cols[SHORTFORM]);
    const longForm = cols[LONGFORM];
    shortForms[shortForm] = longForm;
  });
  // console.info('shortForms', shortForms);
  return shortForms;
}

module.exports = {
  getMappings,
  getAlphabeticContractions,
  getLowerContractions,
  getShortForms
};