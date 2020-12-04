const fs = require('fs').promises;
const { ASCII_GLYPH, BRAILLE_MEANING } = require('./mapping/braille-ascii-columns.js');
const {
  LOWERCASE_LETTER, STANDING_ALONE, WITH_DOTS_5, WITH_DOTS_45, WITH_DOTS_456, WITH_DOTS_46, WITH_DOTS_56
} = require('./mapping/alphabetic-contractions-columns.js');
const {
  LOWER_ASCII, LOWER_ALONE, LOWER_START, LOWER_MIDDLE, LOWER_END
} = require('./mapping/lower-contractions-columns.js');
const {
  LONGFORM, SHORTFORM
} = require('./mapping/shortforms.js');
const dictionary = require('./dictionary/words_dictionary.json');

const brailleMapFile = `./mapping/braille-ascii.tsv`;
const alphabeticContractionsFile = `./mapping/alphabetic-contractions.tsv`;
const lowerContractionsFile = `./mapping/lower-contractions.tsv`;
const shortFormsFile = `./mapping/shortforms.tsv`;


async function loadFile(fileName = '') {
  const data = await fs.readFile(`./sources/${fileName}`, "ascii");
  return data.toString();
}

// TODO: const italicsRegExp = /^(.,)(.*)(,)$/;
// TODO: “” means ?” because “ can be ? and both quotes together makes no sense

const START_QUOTE = '“';
const UPPERCASE_MODIFIER = ',';

const punct = `[,\\.\\-?'"“”]`;  
const leadingPunctuationRegExp = new RegExp(`^${punct}+`);
const trailingPunctuationRegExp = new RegExp(`${punct}+$`);

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

function trimPunctuation(word) {
  const out = word.replace(leadingPunctuationRegExp, '').replace(trailingPunctuationRegExp, '');
  return out;
}
function wordExists(word) {
  return dictionary[trimPunctuation(word.toLowerCase())];
} 

function removeBrackets(string) {
  return string.replace(/[()]/g, '');
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

function getAsciiVersion(
    options = {}, 
    string = '',
    mappings = {},
    alphaContractions = {},
    lowerContractions = {},
    shortForms = {}
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
  function convertLine(inputLine, lineIndex) {
    const log = (...args) => {
      console.log(`L:${lineIndex+1}`, ...args);
    };
    // eslint-disable-next-line no-unused-vars
    const debug = (...args) => {
      if (!options.debug) return;
      console.debug(`L:${lineIndex+1}`, ...args);
    };
    const trace = (...args) => {
      if (!options.trace) return;
      console.trace(`L:${lineIndex+1}`, ...args);
    };

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
      const isLongerThanOneLetter = trimPunctuation(word).length > 1;
      if (isWhitespaceOnly || isLongerThanOneLetter) return word;
      const contraction = trimPunctuation(word).toLowerCase();
      debug('contraction', word, contraction);

      if (alphaContractions.alone[contraction]) {
        Object.keys(alphaContractions.alone)
          .forEach(letter => {
            const contractionRegExp = new RegExp(`\\b[${letter}]\\b`, 'i');
            word = word.replace(contractionRegExp, `${alphaContractions.alone[letter]}`);
          }
        );
      }

      if (lowerContractions.alone[contraction]) {
        Object.keys(lowerContractions.alone)
          .forEach(letter => {
            const contractionRegExp = new RegExp(`\\b[${letter}]\\b`, 'i');
            word = word.replace(contractionRegExp, `${lowerContractions.alone[letter]}`);
          }
        );
      }
        
      //if (alphaContractions.alone[contraction]) return alphaContractions.alone[contraction];
      // if (lowerContractions.alone[contraction]) return lowerContractions.alone[contraction];
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
  
    function addShortFormWholeWords(word) {
      if (shortForms[word]) {
        trace('SFWW', word, shortForms[word]);
        return shortForms[word];
      }
      return word;
    }
  
    const psvShortForms = Object.keys(shortForms).join('|');
    const shortFormRegExp = new RegExp(`(?:${punct}+)?(${psvShortForms})(?:${punct}+)?`, 'ig');
  
    function replaceAllShortForms(word) {
      // eslint-disable-next-line no-unused-vars
      const shortFormised = word.replace(shortFormRegExp, (_match = '', part, index) => {
        const shortFormWordPart = shortForms[part.toLowerCase()];
        const nextChar = word.charAt(index + part.length);
        const noVowelsAfterThis = ['after', 'blind', 'friend'].indexOf(shortFormWordPart) >=0;
        if (noVowelsAfterThis && nextChar.match(/[aeiouy]/i)) {
          // super-specific vowel rule (see http://www.brl.org/intro/session09/short.html)
          return part;
        }
        return shortFormWordPart;
      });
      
      if (wordExists(shortFormised)) {
        return shortFormised;
      }
      // report(`NOT RISKING THIS: ${shortFormised}`);
      return word;    
    }
  
  
    function addShortFormPartWords(word) {
      if (!shortFormRegExp.exec(word)) {
        // no short forms here
        return word;
      }
  
      if (wordExists(word)) {
        // this is already a word, leave it alone
        return word;
      }
  
      if (trimPunctuation(word).indexOf(`'`) >= 1) {
        // don't mess with words with apostrophes - watch out for "what'll" -> "what'little"
        return word;
      }
  
      return replaceAllShortForms(word);
    }
    
    const passes = [];
    function progress(wordsSnapshot) {
      const isFirstPass = !passes.length;
      const pass = passes.length+1;
      const wordsJoined = wordsSnapshot.join(' ');
      const anyChanges = isFirstPass || passes[passes.length-1] !== wordsJoined;
      if (options.logProgress) {
        if (isFirstPass) {
          log(`-----------------------------------------------`);
        } 

        if (anyChanges) {
          log(`PASS`, pass, wordsJoined);
        }
      }
      passes.push(wordsJoined);
    }
    
    // This is needed but screws up y! (you!) done“ (doneth), me: to mewh
    // and leave Sca;ers as Scas (spellcheck....)
    const lowerProcessedLine = applyLowers(inputLine);

    let words = breakBySpaces(lowerProcessedLine);
    progress(words);

    words = words.map(addShortFormWholeWords);
    progress(words);

    words = words.map(handleContractions);
    progress(words);

    words = words.map(handlePrefixes);
    progress(words);

    words = words.map(handleQuotes);
    progress(words);

    words = words.map(addSingleLetterContractions);
    words = words.map(addShortFormPartWords);
    progress(words);

    words = words.map(translateLetters); // DO NOT place this before addSingleLetterContractions
    progress(words);

    // only effect on Chamber of Secrets is Mu7le to Muggle - really should go before translateLetters I think but breaks things
    // words = words.map(addMidWordLowerContractions);
    // progress(words);

    words = words.map(applyModifiers); // MUST go last
    progress(words);

    // TODO: handle numbers
    // TODO: Final Groupsign
    // TODO: Strong Groupsigns/Wordsigns

    let line = words.join(' ');
    
    return line;
  }

  console.info(`${lines.length} lines processed`);

  const translatedLines = lines.slice(options.startLine-1,options.endLine).map(convertLine).join('\n');
  return translatedLines;
}

async function convert(fileName = '', lines = '') {
  console.info(`File: ${fileName}`);
  console.info(`Lines: ${lines}`);

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
    debug: false,
    trace: false,
    logProgress: false
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

  if (reportArray.length) {
    await fs.writeFile(`./output/${fileName}-report`, reportArray.join('\n'), "utf8");
    console.info(`${reportArray.length} warning(s)`);
  }
}

const inputFile = process.argv[2];
const lines = process.argv[3];
convert(inputFile, lines);

module.exports = {
  convert
};

