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

const UPPERCASE_MODIFIER = ',';

function getGlyphEffect(meaning) {
  if (typeof meaning !== 'string') {
    throw new Error('Glyph meaning must be a string');
  }
  if (meaning.charAt(0) === '(') {
    return null;
  }
  return meaning;
}

function arrayOfLines(fileString = '') {
  return fileString.split(/\r\n/);
}

function breakBySpaces(line = '') {
  return line.split(/\s+/);
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
  // console.info(contractions);
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
        return match.toLowerCase();
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
    if (suffixCharacter === UPPERCASE_MODIFIER) {
      console.warn('1', suffixCharacter, suffixLetter);
      return '';
    }

    const dotType = dotTypes[suffixCharacter.toLowerCase()];

    if (!contractions[dotType]) {
      console.warn(`No dotType for ${suffixCharacter}`);
      return '';
    }

    const suffix = contractions[dotType][suffixLetter];

    if (!suffix) {
      console.warn(`No suffix for type: '${dotType}', letter: '${suffixLetter}'`);
      return '';
    }
    
    const noLeadingHyphenSuffix = suffix.replace(/^-/, '');

    return noLeadingHyphenSuffix;
  }

  function handleContractions(word = '') {
    return word.replace(/(["^;_])([a-z!])/ig, (match, dotType, suffixCharacter) => {
      console.log('> > >', dotType, suffixCharacter);
      return getSuffixLetters(dotType, suffixCharacter);
    });
  }

  function handlePrefixes(word = '') {
    return word.replace(/\b(.+?)([.;])(.+?)\b/g, (match, prefix, suffixCharacter, suffix) => {
      return `${prefix}${getSuffixLetters(suffixCharacter, suffix)}`;
    });
  }

  function addSingleLetterContractions(word = '') {
    const isWhitespaceOnly = word.match(/^\s+$/);
    const isLongerThanOneLetter = word.length>1;
    if (isWhitespaceOnly || isLongerThanOneLetter) return word;
    if (contractions.alone[word]) return contractions.alone[word];
    return word;
  }

  function applyModifiers(word = '') {
    if (word.charAt(0) === UPPERCASE_MODIFIER) {
      return `${word.charAt(1).toUpperCase()}${word.substring(2)}`;
    }  
    return word;
  }

  function handleQuotes(word) {
    if (word.charAt(0) === '"' && word.charAt(1) === ',') {
      return `"${word.charAt(2).toUpperCase()}${word.substring(3)}`;
    }
    return word;
  }

  function convertLine(inputLine) {

    let words = breakBySpaces(inputLine);

    words = words.map(handleContractions);
  
    words = words.map(handlePrefixes);
    
    words = words.map(addSingleLetterContractions);
  
    words = words.map(applyModifiers);

    words = words.map(handleQuotes);

    words = words.map(translateLetters);

    // // console.log(`INPUT:  ${words.join('\t')}`);
    // // console.log(`OUTPUT: ${wordsWithLettersTranslated.join('\t')}`);

    // console.log(`INPUT:  ${wordsWithLettersTranslated.join('\t')}`);
    // console.log(`OUTPUT: ${wordsWithPrefixesTranslated.join('\t')}`);

    // console.log(words);
    let line = words.join(' ');
    line = line.replace(/\b",(.)(.+)\b/g, (match, firstLetter, otherLetters) => {
      return `${firstLetter.toUpperCase()}${otherLetters}`;
    });


    line = line.replace(new RegExp("\\b([a-z]+)(" + ',' + ")([a-z]+)\\b","gi"), (match, start, middle, end) => {
      const middleMod = 'ea';
      console.log(`${start}${middleMod}${end}`);
      console.log('---------------------------------');
      return `${start}${middleMod}${end}`;
    });
        
    return line;
  }

  const translatedLines = lines.map(convertLine).join('\n');
  return translatedLines;
}

async function convert(fileName = '') {
  console.info(`File: ${fileName}`);
  const mappings = await getMappings();
  const contractions = await getContractions();
  const fileContents = await loadFile(fileName);
  const asciiVersion = getAsciiVersion(fileContents.toLowerCase(), mappings, contractions);
  console.log(asciiVersion);
}

const inputFile = process.argv[2];
convert(inputFile);

module.exports = {
  convert
};

