" @param {string} pat
" @return {[
"   string,
"   string,
" ]}
function! ddc_file#internal#info(pat) abort
  let input_line = getline('.')[: col('.') - 1]
  let input_file = input_line[match(input_line, a:pat) :]
  let input_file_trail_keywords = input_file[match(input_file, '\k*$') :]
  let buf_path = expand('%:p')

  return [
      \ input_file,
      \ input_file_trail_keywords,
      \ buf_path,
    \ ]
endfunction
