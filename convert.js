const fs = require('fs').promises;
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

async function loadFile(fileName = '') {
  const data = await fs.readFile(`./sources/${fileName}`, "ascii");
  return data.toString();
}

const START_QUOTE = '"';
const UPPERCASE_MODIFIER = ',';

const reportArray = [];

function report(string = '') {
  reportArray.push(string);
}

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

function getAsciiVersion(
    options = {}, 
    string = '',
    mappings = {},
    alphaContractions = {},
    lowerContractions = {}
  ) {
  const lines = arrayOfLines(options.forceLowercaseOnInput ? string.toLowerCase() : string);

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
    '_': 'dots_456',
    '.': 'dots_'
  };

  function getSuffixLetters(suffixCharacter = '', suffixLetter = '') {
    const dotType = dotTypes[suffixCharacter.toLowerCase()];

    if (!alphaContractions[dotType]) {
      console.warn(`No dotType for ${suffixCharacter}`);
      return '';
    }

    const suffix = alphaContractions[dotType][suffixLetter];

    if (!suffix) {
      report(`No suffix for type: '${dotType}', letter: '${suffixLetter}'`);
      return '';
    }
    
    const noLeadingHyphenSuffix = suffix.replace(/^-/, '');

    return noLeadingHyphenSuffix;
  }

  function handleContractions(word = '') {
    return word.replace(/(["^;_])([a-z!])/ig, (match, dotType, suffixCharacter) => {
      return getSuffixLetters(dotType, suffixCharacter);
    });
  }

  function handlePrefixes(word = '') {
    return word.replace(/\b(.+?)([;])(.+?)\b/g, (match, prefix, suffixCharacter, suffix) => {
      return `${prefix}${getSuffixLetters(suffixCharacter, suffix)}`;
    });
  }

  function addSingleLetterContractions(word = '') {
    const isWhitespaceOnly = word.match(/^\s+$/);
    const isLongerThanOneLetter = word.length>1;
    if (isWhitespaceOnly || isLongerThanOneLetter) return word;
    const contraction = word.toLowerCase();
    if (alphaContractions.alone[contraction]) return alphaContractions.alone[contraction];
    if (lowerContractions.alone[contraction]) return lowerContractions.alone[contraction];
    return word;
  }

  function applyModifiers(word = '') {
    if (word.substring(0,2) === `${START_QUOTE}${UPPERCASE_MODIFIER}`) {
      // TODO: handle 2-3 uppercase modifiers
      return `${START_QUOTE}${word.charAt(2).toUpperCase()}${word.substring(3)}`;
    }  

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

  function trimHyphens(string = '') {
    if (string.length === 1) {
      return string;
    }
    return string.replace(/^-/, '').replace(/-$/, '');   
  }

  function applyLowers(line = '') {
    line = line.replace(/\b",(.)(.+)\b/g, (match, firstLetter, otherLetters) => {
      return `${firstLetter.toUpperCase()}${otherLetters}`;
    });

    Object.keys(lowerContractions.middle).forEach( ascii => {
      const replacement = trimHyphens(lowerContractions.middle[ascii]);
      line = line.replace(new RegExp("\\b([a-z]+)([" + ascii + "])([a-z]+)\\b","gi"), (match, start, middle, end) => {
        const translated = `${start}${replacement}${end}`;
        return translated;
      });
    });
        
    Object.keys(lowerContractions.end).forEach( ascii => {
      const replacement = trimHyphens(lowerContractions.end[ascii]);
      line = line.replace(new RegExp("\\b([a-z]+)(" + ascii + ")\\b","gi"), (match, start) => {
        const translated = `${start}${replacement}`;
        return translated;
      });
    });
    return line;    
  }
  function convertLine(inputLine) {

    const lowerProcessedLine = applyLowers(inputLine);

    let words = breakBySpaces(lowerProcessedLine);

    words = words.map(handleContractions);
  
    words = words.map(handlePrefixes);
      
    words = words.map(handleQuotes);

    words = words.map(addSingleLetterContractions);

    words = words.map(translateLetters);

    words = words.map(applyModifiers);

    // TODO: handle numbers
    // TODO: Final Groupsign
    // TODO: Strong Groupsigns/Wordsigns
    
    // console.log(words);

    let line = words.join(' ');
    
    return line;
  }

  console.info(`${lines.length} lines processed`);

  const translatedLines = lines.map(convertLine).join('\n');
  return translatedLines;
}

async function convert(fileName = '') {
  console.info(`File: ${fileName}`);
  const mappings = await getMappings();
  const alphaContractions = await getAlphabeticContractions();
  const lowerContractions = await getLowerContractions();
  const fileContents = await loadFile(fileName);
  const isFormalBRF = fileName.toLowerCase().indexOf('.brf') >= 0;
  const options = {
    forceLowercaseOnInput: isFormalBRF
  };

  const asciiVersion = getAsciiVersion(
    options, 
    fileContents,
    mappings,
    alphaContractions,
    lowerContractions
  );
  await fs.writeFile(`./output/${fileName}`, asciiVersion, "utf8");

  if (reportArray.length) {
    await fs.writeFile(`./output/${fileName}-report`, reportArray.join('\n'), "utf8");
    console.info(`${reportArray.length} warning(s)`);
  }
}

const inputFile = process.argv[2];
convert(inputFile);

module.exports = {
  convert
};

