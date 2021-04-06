# NOTES

Usage

   node convert chamber.brf 20-31 progress

# TODO

- ';[a-z]' means don't change the letter (e.g this is 'M'), fix line 519
- `Mc,gonagall` - mid word uppercase...
- `H,dmaster`
- `_st` seems to be `/`
- check line 1971

## NEEDING UNICODE OR HTML
- '^ste' is e acute i.e. 'S^stean' = Séan

## NEEDING ADDITIONAL MARKUP

- '.7,' is 'Italics representing a title' - line 2018 has this sequence '.7,!' for 'The'
- const italicsRegExp = /^(.,)(.*)(,)$/;
- `“.,,jiery .,pokery!”` should be italicised ‘Jiggery pokery!’ 

## MULTILINE

- ',,,' = uppercase sentence
- ',,' = uppercase word
- `“,,i warned ythe i will not`
