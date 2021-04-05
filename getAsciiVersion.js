const { arrayOfLines, report } = require('./utils');

const dictionary = require('./dictionary/words_dictionary.json');

const START_QUOTE = '“';
const UPPERCASE_MODIFIER = ',';

const vowelsRegExp = /[aeiouy]/i;

const punct = `,\\.\\-?'"“”`; // not that 8 means different things leading or trailing
const leadingPunct = `${punct}`; // adds punctuation only seen leading
const trailingPunct = `${punct}!`; // adds punctuation only seen trailing
const leadingQuote = '8'; 
const trailingQMark = '8'; 
const leadingPunctuationRegExp = new RegExp(`^[${leadingPunct}]+`);
const trailingPunctuationRegExp = new RegExp(`[${trailingPunct}]+$`);
const leadingQuoteRegExp = new RegExp(`^[${leadingQuote}]`);
const trailingQMarkRegExp = new RegExp(`[${trailingQMark}]$`);

// for short forms - needs merging with the above similarly named vars - cautiously!
const brailleChars = 'a-z?+9\\/$';
const brailleMids = '\\];'; // these characters must not go at the end of the word
const leadingPunc = '8,';
const trailingPunc = ',.\\-123468';
const leadingPuncGroup = `(?:[${leadingPunc}]*)`;
const trailingPuncGroup = `(?:[${trailingPunc}]*)`;

const bookMarkup = {
  ' "3#': ' Page #',
  ' "33333333333': '------------------------'
};

const brailleNumberForLetter = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8,
  i: 9,
  j: 0,
  '"': '-',
  '4': '.'
};

const shortFormTrickyList = {
  // hard to pick up due to word borders
  'y’ve': `you've`,
  'y’re': `you're`
};

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

function hasVowels(word) {
  return vowelsRegExp.exec(word);
}

function wordExists(word) {
  // check there are any vowels because the present dictionary contains ludicrous non-words like 'bl', blocking 'blind'
  return hasVowels(word) && dictionary[trimPunctuation(word.toLowerCase())];
}

function getAsciiVersion(
  options = {}, 
  string = '',
  mappings = {},
  brailleOnlyContractions = {},
  alphaContractions = {},
  lowerContractions = {},
  shortForms = {}
) {
const lines = arrayOfLines(options.forceLowercaseOnInput ? string.toLowerCase() : string);

function translateLetters(word) {
  if (word.indexOf('#')>=0) {
    return word;
  }

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

function onlyMultiLetter(contraction = '') {
  return contraction.length > 1;
}

function regexpSafe(string = '') {
  return string.replace(/([\\|^$?])/g, '\\$1');
}

function addBrailleOnlyContractions(word) {
  const notWordEdge = `(?![ ${leadingPunc}]+)`;
  Object.keys(brailleOnlyContractions.chars).filter(onlyMultiLetter).forEach(contraction => {
    if (word.indexOf(contraction) >= 0) {
      // console.log('contraction', contraction);
      const reg = new RegExp(`${notWordEdge}${regexpSafe(contraction)}`, "ig");
      const replacement = brailleOnlyContractions.chars[contraction];
      word = word.replace(reg, `${replacement}`);
    }
  });
  return word;
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
    console.debug(`L:${lineIndex+1}`, ...args);
  };

  // moving this outside convertLine causes regressions on "hm." at start of line
  const psvShortForms = Object.keys(shortForms).join('|');
  const shortFormRegExp = new RegExp(`(${leadingPuncGroup})(${psvShortForms})(${trailingPuncGroup})`, 'ig');

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
 
  function processContractions(word = '', regexp, replacement = '') {
    // console.log('regexp', word, regexp);
    return word.replace(regexp, (match, start, middle, end) => {
      const translated = `${start}${replacement}${end}`;
      // console.log('translated', word, match, translated);
      return translated;
    });      
  } 

  function addSingleLetterContractions(word = '') {
    const isWhitespaceOnly = word.match(/^\s+$/);
    if (isWhitespaceOnly) return word;
    const contraction = trimPunctuation(word).toLowerCase();
    debug('contraction', word, contraction);

    Object.keys(alphaContractions.alone).forEach( char => {
      const replacement = trimHyphens(alphaContractions.alone[char]);
      const reg = new RegExp(`^(${leadingPuncGroup})([${char}])(${trailingPuncGroup})$`,"gi");
      // console.log('regexp', word, reg, replacement);
      word = processContractions(word, reg, replacement);
    });


    Object.keys(lowerContractions.alone).forEach( char => {
      const replacement = trimHyphens(lowerContractions.alone[char]);
      const reg = new RegExp(`^(${leadingPuncGroup})([${char}])(${trailingPuncGroup})$`,"gi");
      // console.log('regexp', word, reg, replacement);
      word = processContractions(word, reg, replacement);
    });    
      
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

  function applyLowers(word = '') {
    Object.keys(lowerContractions.start).forEach( char => {
      const replacement = trimHyphens(lowerContractions.start[char]);
      const reg = new RegExp(`^(${leadingPuncGroup})([${char}])([${brailleMids}]*?[${brailleChars}]+?${trailingPuncGroup})$`,"gi");
      word = processContractions(word, reg, replacement);
    });

    Object.keys(lowerContractions.middle).forEach( char => {
      const replacement = trimHyphens(lowerContractions.middle[char]);
      const reg = new RegExp(`^(${leadingPuncGroup}[${brailleChars}]+?[${brailleMids}]*?)([${char}])([${brailleMids}]*?[${brailleChars}]+?${trailingPuncGroup})$`,"gi");
      // console.log('regexp', word, reg, replacement);
      word = processContractions(word, reg, replacement);
    });
        
    Object.keys(lowerContractions.end).forEach( char => {
      const replacement = trimHyphens(lowerContractions.end[char]);
      const reg = new RegExp(`^(${leadingPuncGroup}[${brailleChars}]+?[${brailleMids}]*?)([${char}])(${trailingPuncGroup})$`,"gi");
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

  function addEnDash(line = '') {
    return line;
    // return line.replace(/,-/g, ' -- ');
  }

  function replaceBookMarkupCharacters(line = '') {
    Object.keys(bookMarkup).forEach(char => {
      line = line.replace(char, bookMarkup[char]);
    });
    return line;
  }

  function replaceBraillePunctuation(line = '') {
    braillePunctuation.forEach(arr => {
      const chars = arr[0];
      const replacement = arr[1];
      const reg = new RegExp(`${chars}`, 'gi');
      line = line.replace(reg, replacement);
    });
    return line;
  }

  function convertBrailleNumber(string = '') {
    return string.replace(/./g, letter => {
      const num = brailleNumberForLetter[letter];
      if (num === undefined) {
        console.error('Not a braille number', letter);
        return '';
      }
      return num;
    });
  }

  function addNumbers(word = '') {
    return word.replace(/#([a-j"4]+)\b/g, (full, group) => {
      // leave number marker in to prevent conversion into chars
      return '#' + convertBrailleNumber(group);
    });
  }

  const braillePunctuation = [
    // just easier to handle this after translation
    ['"<', ' #(# '],
    ['">3', ' #):# '],
    ['">4', ' #).# '],    
    ['">1', ' #),# '],
    ['">', ' #)# '],
    [',-0', ' #ENDASHQUOTE# '],
    [',-', ' #ENDASH# '],
    ['4440', ' #ELLIPSISQUOTE#'],
    ['444', ' #ELLIPSIS#']
  ];

  function removeMarkers(line = '') {
    line = line.replace(/ #\(# /g, ' (');
    line = line.replace(/ #\):# /g, '): ');
    line = line.replace(/ #\),# /g, '), ');
    line = line.replace(/ #\).# /g, '). ');      
    line = line.replace(/ #\)# /g, ') ');     
    line = line.replace(/ #ELLIPSISQUOTE#/g, '... ”');
    line = line.replace(/ #ELLIPSIS#/g, '... ');
    line = line.replace(/ #ENDASHQUOTE#/g, ' - ”');
    line = line.replace(/ #ENDASH# /g, ' - ');
    line = line.replace(/#/g, '');
    return line;
  }

  function replaceAllShortForms(word) {
    // eslint-disable-next-line no-unused-vars
    const shortFormised = word.replace(shortFormRegExp, (_match = '', leading, part, trailing, index) => {
      // console.log('part', leading, part, trailing)
      const shortFormWordPart = shortForms[part.toLowerCase()];
      const nextChar = word.charAt(index + part.length);
      const noVowelsAfterThis = ['after', 'blind', 'friend'].indexOf(shortFormWordPart) >=0;
      if (noVowelsAfterThis && nextChar.match(vowelsRegExp)) {
        // super-specific vowel rule (see http://www.brl.org/intro/session09/short.html)
        return part;
      }
      return `${leading}${shortFormWordPart}${trailing}`;
    });

    const shortFormWordOnly = shortFormised.replace(/[’'!;]/g,'');
    const missingAbbreviations = ['couldve','wouldve', 'mustve', 'first-years', 'yve' ,'yd'];
    
    if (missingAbbreviations.indexOf(shortFormWordOnly)  >= 0) {
      return shortFormised;
    }

    if (wordExists(shortFormWordOnly)) {
      if (shortFormWordOnly.indexOf('fred') >=0) {
        console.log(shortFormWordOnly);
      }
      return shortFormised;
    }
    // console.warn(`NOT RISKING THIS: '${shortFormised}' FOR '${word}`);
    return word;    
  }

  function addShortFormPartWords(word) {
    if (word && shortFormTrickyList[trimPunctuation(word)]) {
      Object.keys(shortFormTrickyList).forEach( chars => {
        const replacement = shortFormTrickyList[chars];
        const reg = new RegExp(`^(${leadingPuncGroup})(${chars})(${trailingPuncGroup})$`,"gi");
        word = processContractions(word, reg, replacement);
        // console.info('found tricky short form', word);
      });
    }

    if (!shortFormRegExp.exec(word)) {
      // console.info('no short forms here', word);
      return word;
    }

    if (wordExists(word)) {
      // console.info('this is already a word, leave it alone', word);
      return word;
    }

    if (trimPunctuation(word).indexOf(`'`) >= 1) {
      // console.info('do not mess with words with apostrophes', word); // watch out for "what'll" -> "what'little"
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
  progress('applyCase', breakBySpaces(lowerProcessedLine));

  const noMarkupLine = replaceBookMarkupCharacters(lowerProcessedLine);
  progress('replaceBookMarkupCharacters', breakBySpaces(noMarkupLine));

  const punctuatedLine = replaceBraillePunctuation(noMarkupLine);
  progress('replaceBraillePunctuation', breakBySpaces(punctuatedLine));

  let words = breakBySpaces(punctuatedLine);
  
  words = words.map(addNumbers);
  progress('addNumbers', words);
  
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

  words = words.map(addBrailleOnlyContractions);
  progress('addBrailleOnlyContractions', words);

  words = words.map(translateLetters); // DO NOT place this before addSingleLetterContractions
  progress('translateLetters', words);

  words = words.map(addShortFormPartWords);
  progress('addShortFormPartWords', words);

  // only effect on Chamber of Secrets is Mu7le to Muggle - really should go before translateLetters I think but breaks things
  // words = words.map(addMidWordLowerContractions);
  // progress(words);

  words = words.map(handleQuestionMarks);
  progress('handleQuestionMarks', words);

  words = words.map(addWordSigns);
  progress('addWordSigns', words);

  words = words.map(applyModifiers); // MUST go last
  progress('applyModifiers', words);

  let line = removeMarkers(addEnDash(words.join(' ')));
  
  return line;
}

function sanityChecks() {
  if (options.startLine > lines.length) {
    console.warn('Start line is after the end of the document. Expect no output.', options.startLine, '>', lines.length);
  }
}

sanityChecks();

if (options.endLine === Infinity) {
  options.endLine = lines.length;
}

const linesToProcess = lines.slice(options.startLine-1, options.endLine-1);
const translatedLines = linesToProcess.map(convertLine).join('\n');
console.info(`${translatedLines.length} lines processed`);
return translatedLines;
}

module.exports = getAsciiVersion;