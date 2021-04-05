# NOTES

Usage

   node convert chamber.brf 20-31 progress

# TODO

- ';[a-z]' means don't change the letter (e.g this is 'M')
- ',,,' = uppercase sentence
' ',,' = uppercase word
- line 2018 has weird sequence '.7,!' for 'The' - italic I think
- `“.,,ji7ery .,pokery!”` should be italicised ‘Jiggery pokery!’ 
- `lessons "ghthough perh not Snape,`
- `“I meant ^“pl,se^”!”`
- `“,,i warned ythe i will not`
- short forms with brackets showing 2 words e.g. mst / m(st)
- handle numbers
- Final Groupsign
- `Mc,gonagall` - mid word uppercase...
- `H,dmaster`
- const italicsRegExp = /^(.,)(.*)(,)$/;
- `_st` seems to be `/`
- ` ":#aj` (line) is page break with number
