" @param {string} pat
" @return {[
"   string,
"   string,
" ]}
function! ddc_file#internal#info(pat) abort
  let line = getline('.')[: col('.') - 1]
  let file = line[match(line, a:pat) :]
  let buf_path = expand('%:p')

  return [
      \ file,
      \ buf_path,
    \ ]
endfunction
