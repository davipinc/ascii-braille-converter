const { arrayOfLines, report } = require('./utils');

const dictionary = require('./dictionary/words_dictionary.json');

const START_QUOTE = '“';
const UPPERCASE_MODIFIER = ',';

const punct = `,\\.\\-?'"“”`; // not that 8 means different things leading or trailing
const leadingPunct = `${punct}`; // adds punctuation only seen leading
const trailingPunct = `${punct}`; // adds punctuation only seen trailing
const leadingQuote = '8'; 
const trailingQMark = '8'; 
const leadingPunctuationRegExp = new RegExp(`^[${leadingPunct}]+`);
const trailingPunctuationRegExp = new RegExp(`[${trailingPunct}]+$`);
const leadingQuoteRegExp = new RegExp(`^[${leadingQuote}]`);
const trailingQMarkRegExp = new RegExp(`[${trailingQMark}]$`);

function trimQuoteAndQMark(word) {
  if (word !== leadingQuote) {
    word = word.replace(leadingQuoteRegExp, '');
  }

  if (word !== trailingQMark) {
    word = word.replace(trailingQMarkRegExp, '');
  }
  return word;
}

function trimPunctuation(word) {
  word = trimQuoteAndQMark(word);
  word = word.replace(leadingPunctuationRegExp, '').replace(trailingPunctuationRegExp, '');
  return word;
}

function breakBySpaces(line = '') {
  return line.split(/\s+/);
}

function wordExists(word) {
  return dictionary[trimPunctuation(word.toLowerCase())];
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
  '.': 'dots_46'
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

  const debug = (...args) => {
    if (!options.debug) return;
    console.debug(`L:${lineIndex+1}`, ...args);
  };
  const trace = (...args) => {
    if (!options.trace) return;
    console.trace(`L:${lineIndex+1}`, ...args);
  };

  function handleContractions(word = '') {
    return word.replace(/(["^;_.])([a-z!])/ig, (match, dotType, suffixCharacter) => {
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

  function addWordSigns(word) {
    const wordsigns = {
      ch: 'child',
      sh: 'shall',
      th: 'this',
      wh: 'which',
      ou: 'out',
      st: 'st'
    };

    Object.keys(wordsigns).forEach(sign => {
      // the \\. is to prevent matching ch.e as child.e when it is chance
      word = word.replace(new RegExp("(?!\\.)\\b(" + sign + ")\\b(?!\\.)","gi"), (match, sign) => {
        return wordsigns[sign];
      });
    });

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

  function applyCase(line = '') {
    // TODO: failing on `Right,-,i'm` because adjacent to ellipsis
    line = line.replace(/\b",(.)(.+)\b/g, (match, firstLetter, otherLetters) => {
      return `${firstLetter.toUpperCase()}${otherLetters}`;
    });

    return line;
  }

  function processContractions(word = '', regexp, replacement = '') {
    // console.log('reg', word, reg);
    return word.replace(regexp, (match, start, middle, end) => {
      const translated = `${start}${replacement}${end}`;
      // console.log('translated', word, match, translated);
      return translated;
    });      
  }


  function applyLowers(word = '') {
    const brailleChars = 'a-z\\?\\+\\/';
    const leadingPuncGroup = '(?:[8,“]*)';
    const trailingPuncGroup = '(?:[,”]*)';

    Object.keys(lowerContractions.start).forEach( char => {
      const replacement = trimHyphens(lowerContractions.start[char]);
      const reg = new RegExp(`^(${leadingPuncGroup})([${char}])([${brailleChars}]+${trailingPuncGroup})$`,"gi");
      word = processContractions(word, reg, replacement);
    });

    Object.keys(lowerContractions.middle).forEach( char => {
      const replacement = trimHyphens(lowerContractions.middle[char]);
      const reg = new RegExp(`^(${leadingPuncGroup}[${brailleChars}]+)([${char}])([${brailleChars}]+${trailingPuncGroup})$`,"gi");
      word = processContractions(word, reg, replacement);
    });
        
    Object.keys(lowerContractions.end).forEach( char => {
      const replacement = trimHyphens(lowerContractions.end[char]);
      const reg = new RegExp(`^(${leadingPuncGroup}[${brailleChars}]+)([${char}])(${trailingPuncGroup})$`,"gi");
      word = processContractions(word, reg, replacement);
    });

    return word;    
  }

  function addShortFormWholeWords(word) {
    if (shortForms[word]) {
      trace('SFWW', word, shortForms[word]);
      return shortForms[word];
    }
    return word;
  }

  function addEllipses(line = '') {
    return line.replace(/,-/g, '...');
  }

  const psvShortForms = Object.keys(shortForms).join('|');
  const shortFormRegExp = new RegExp(`(?:[${leadingPunct}]+)?(${psvShortForms})(?:[${trailingPunct}]+)?`, 'ig');

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
  
  function handleQuestionMarks(word) {
    return word.replace(/“”/g, '?”');
  }

  const passes = [];
  function progress(operationName = '', wordsSnapshot) {
    const isFirstPass = !passes.length;
    const pass = passes.length+1;
    const wordsJoined = wordsSnapshot.join(' ');
    const anyChanges = isFirstPass || passes[passes.length-1] !== wordsJoined;
    if (options.logProgress) {
      if (isFirstPass) {
        log(`-----------------------------------------------`);
      } 

      if (anyChanges) {
        log(pass, wordsJoined, ` [${operationName}]`);
      }
    }
    passes.push(wordsJoined);
  }


  // initial state
  progress('START', breakBySpaces(inputLine));
  
  // This is needed but screws up y! (you!) done“ (doneth), me: to mewh
  // and leave Sca;ers as Scas (spellcheck....)
  const lowerProcessedLine = applyCase(inputLine);

  let words = breakBySpaces(lowerProcessedLine);
  progress('applyCase', words);

  words = words.map(applyLowers);
  progress('applyLowers', words);

  words = words.map(addShortFormWholeWords);
  progress('addShortFormWholeWords', words);

  words = words.map(handleContractions);
  progress('handleContractions', words);

  words = words.map(handlePrefixes);
  progress('handlePrefixes', words);

  words = words.map(handleQuotes);
  progress('handleQuotes', words);

  words = words.map(addSingleLetterContractions);
  progress('addSingleLetterContractions', words);

  words = words.map(addShortFormPartWords);
  progress('addShortFormPartWords', words);

  words = words.map(translateLetters); // DO NOT place this before addSingleLetterContractions
  progress('translateLetters', words);

  // only effect on Chamber of Secrets is Mu7le to Muggle - really should go before translateLetters I think but breaks things
  // words = words.map(addMidWordLowerContractions);
  // progress(words);

  words = words.map(handleQuestionMarks);
  progress('handleQuestionMarks', words);

  words = words.map(addWordSigns);
  progress('addWordSigns', words);

  words = words.map(applyModifiers); // MUST go last
  progress('applyModifiers', words);

  let line = addEllipses(words.join(' '));
  
  return line;
}

console.info(`${lines.length} lines processed`);

const translatedLines = lines.slice(options.startLine-1,options.endLine).map(convertLine).join('\n');
return translatedLines;
}

module.exports = getAsciiVersion;