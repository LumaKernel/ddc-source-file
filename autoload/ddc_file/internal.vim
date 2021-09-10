" @return {[
"   string,
"   string,
" ]}
function! ddc_file#internal#info() abort
  let line = getline('.')[: col('.') - 1]
  let file = line[match(line, '[[:fname:]\\\/]*$') :]
  let buf_path = expand('%:p')

  return [
      \ file,
      \ buf_path,
    \ ]
endfunction
