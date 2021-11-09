function! s:line_to_file_full(line, is_posix) abort
  return matchlist(
    \ a:line,
    \ a:is_posix
       \ ? '[[:fname:]/]*$'
       \ : '[[:fname:]\\]*$'
  \ )[0]
endfunction

function! s:full_to_base_prefix(full, is_posix) abort
  return get(matchlist(
    \ a:full,
    \ a:is_posix
      \ ? '\%(.*\/\|^\)\(.*[^[:keyword:]/]\)[[:keyword:]]*$'
      \ : '\%(.*\\\|^\)\(.*[^[:keyword:]\\]\)[[:keyword:]]*$'
  \ ), 1, '')
endfunction

" @param {string} input_line
" @param {boolean} is_posix
" @return {[
"   string,
"   string,
"   string,
" ]}
function! ddc_file#internal#info(input_line, is_posix) abort
  let input_file_full = s:line_to_file_full(a:input_line, a:is_posix)
  let input_file_base_prefix = s:full_to_base_prefix(input_file_full, a:is_posix)

  if &buftype ==# '' && expand('%:p') !=# ''
    let buf_path = expand('%:p')
  else
    let buf_path = getcwd() . '/dummy'
  endif

  return [
      \ input_file_full,
      \ input_file_base_prefix,
      \ buf_path,
    \ ]
endfunction

function! ddc_file#internal#_test() abort
  let isk_s = &isk
  let isf_s = &isf
  let errors_s = v:errors
  try
    let v:errors = []

    " posix
    let &isk = '@,48-57,_,192-255'
    let &isf = '@,48-57,/,.,-,_,+,,,#,$,%,~,='
    call assert_equal('', s:line_to_file_full('', v:true))
    call assert_equal('.', s:line_to_file_full('.', v:true))
    call assert_equal('.', s:line_to_file_full('. .', v:true))
    call assert_equal('abc', s:line_to_file_full('abc', v:true))
    call assert_equal('bb', s:line_to_file_full('aa bb', v:true))
    call assert_equal('bb', s:line_to_file_full('aa bb', v:true))
    call assert_equal('bb/aa', s:line_to_file_full('aa ff bb/aa', v:true))
    call assert_equal('.bb/aa', s:line_to_file_full('aa ff .bb/aa', v:true))
    call assert_equal('./bb/aa', s:line_to_file_full('aa ff ./bb/aa', v:true))
    call assert_equal('../bb/aa', s:line_to_file_full('aa ff ../bb/aa', v:true))
    call assert_equal('a', s:line_to_file_full('\a', v:true))
    call assert_equal('./a', s:line_to_file_full('\./a', v:true))
    call assert_equal('', s:full_to_base_prefix('', v:true))
    call assert_equal('', s:full_to_base_prefix('a', v:true))
    call assert_equal('', s:full_to_base_prefix('abc', v:true))
    call assert_equal('', s:full_to_base_prefix('/abc', v:true))
    call assert_equal('.', s:full_to_base_prefix('.', v:true))
    call assert_equal('.', s:full_to_base_prefix('.a', v:true))
    call assert_equal('.', s:full_to_base_prefix('.abc', v:true))
    call assert_equal('', s:full_to_base_prefix('./abc', v:true))
    call assert_equal('', s:full_to_base_prefix('./', v:true))
    call assert_equal('', s:full_to_base_prefix('//', v:true))
    call assert_equal('.', s:full_to_base_prefix('/.', v:true))
    call assert_equal('.', s:full_to_base_prefix('./.', v:true))
    call assert_equal('.', s:full_to_base_prefix('./.a', v:true))
    call assert_equal('.a.', s:full_to_base_prefix('./.a.', v:true))
    call assert_equal('.a.', s:full_to_base_prefix('./.a.b', v:true))
    call assert_equal('.a.b.', s:full_to_base_prefix('./.a.b.', v:true))
    call assert_equal('', s:full_to_base_prefix('./a', v:true))
    call assert_equal('a.', s:full_to_base_prefix('./a.', v:true))
    call assert_equal('a.', s:full_to_base_prefix('./a.b', v:true))
    call assert_equal('a.b.', s:full_to_base_prefix('./a.b.', v:true))
    call assert_equal('.', s:full_to_base_prefix('.', v:true))
    call assert_equal('.', s:full_to_base_prefix('.a', v:true))
    call assert_equal('.a.', s:full_to_base_prefix('.a.', v:true))
    call assert_equal('.a.', s:full_to_base_prefix('.a.b', v:true))
    call assert_equal('.a.b.', s:full_to_base_prefix('.a.b.', v:true))
    call assert_equal('', s:full_to_base_prefix('a', v:true))
    call assert_equal('a.', s:full_to_base_prefix('a.', v:true))
    call assert_equal('a.', s:full_to_base_prefix('a.b', v:true))
    call assert_equal('a.b.', s:full_to_base_prefix('a.b.', v:true))
    call assert_equal('a.b.', s:full_to_base_prefix('a.b.', v:true))

    " win32
    " NOTE: '/' is included as well as '\'.
    let &isk = '@,48-57,_,128-167,224-235'
    let &isf = '@,48-57,/,\,.,-,_,+,,,#,$,%,{,},[,],:,@-@,!,~,='
    call assert_equal('', s:line_to_file_full('', v:false))
    call assert_equal('.', s:line_to_file_full('.', v:false))
    call assert_equal('.', s:line_to_file_full('. .', v:false))
    call assert_equal('abc', s:line_to_file_full('abc', v:false))
    call assert_equal('bb', s:line_to_file_full('aa bb', v:false))
    call assert_equal('bb', s:line_to_file_full('aa bb', v:false))
    call assert_equal('bb\aa', s:line_to_file_full('aa ff bb\aa', v:false))
    call assert_equal('.bb\aa', s:line_to_file_full('aa ff .bb\aa', v:false))
    call assert_equal('.\bb\aa', s:line_to_file_full('aa ff .\bb\aa', v:false))
    call assert_equal('..\bb\aa', s:line_to_file_full('aa ff ..\bb\aa', v:false))
    call assert_equal('/a', s:line_to_file_full('/a', v:false))
    call assert_equal('/.\a', s:line_to_file_full('/.\a', v:false))
    call assert_equal('', s:full_to_base_prefix('', v:false))
    call assert_equal('', s:full_to_base_prefix('a', v:false))
    call assert_equal('', s:full_to_base_prefix('abc', v:false))
    call assert_equal('', s:full_to_base_prefix('\abc', v:false))
    call assert_equal('.', s:full_to_base_prefix('.', v:false))
    call assert_equal('.', s:full_to_base_prefix('.a', v:false))
    call assert_equal('.', s:full_to_base_prefix('.abc', v:false))
    call assert_equal('', s:full_to_base_prefix('.\abc', v:false))
    call assert_equal('./', s:full_to_base_prefix('./', v:false))
    call assert_equal('', s:full_to_base_prefix('\\', v:false))
    call assert_equal('.', s:full_to_base_prefix('\.', v:false))
    call assert_equal('.', s:full_to_base_prefix('.\.', v:false))
    call assert_equal('.', s:full_to_base_prefix('.\.a', v:false))
    call assert_equal('.a.', s:full_to_base_prefix('.\.a.', v:false))
    call assert_equal('.a.', s:full_to_base_prefix('.\.a.b', v:false))
    call assert_equal('.a.b.', s:full_to_base_prefix('.\.a.b.', v:false))
    call assert_equal('', s:full_to_base_prefix('.\a', v:false))
    call assert_equal('a.', s:full_to_base_prefix('.\a.', v:false))
    call assert_equal('a.', s:full_to_base_prefix('.\a.b', v:false))
    call assert_equal('a.b.', s:full_to_base_prefix('.\a.b.', v:false))
    call assert_equal('.', s:full_to_base_prefix('.', v:false))
    call assert_equal('.', s:full_to_base_prefix('.a', v:false))
    call assert_equal('.a.', s:full_to_base_prefix('.a.', v:false))
    call assert_equal('.a.', s:full_to_base_prefix('.a.b', v:false))
    call assert_equal('.a.b.', s:full_to_base_prefix('.a.b.', v:false))
    call assert_equal('', s:full_to_base_prefix('a', v:false))
    call assert_equal('a.', s:full_to_base_prefix('a.', v:false))
    call assert_equal('a.', s:full_to_base_prefix('a.b', v:false))
    call assert_equal('a.b.', s:full_to_base_prefix('a.b.', v:false))
  finally
    for e in v:errors
      echom e
    endfor
    if len(v:errors) == 0
      echom "OK"
    endif
    let &isk = isk_s
    let &isf = isf_s
    let v:errors = errors_s
  endtry
endfunction
