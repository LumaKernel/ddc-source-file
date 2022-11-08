function! s:line_to_file_full(line, is_posix) abort
  let separator = a:is_posix ? '/' : '\\'
  let pattern = printf('\c\%%(^\$\%%(env:\)\?\)\?[[:fname:]%s]*$', separator)
  return matchlist(a:line, pattern)[0]
endfunction

function! s:full_to_base_prefix(full, chars, is_posix) abort
  let separator = a:is_posix ? '/' : '\'
  let separator2 = a:is_posix ? '/' : '\\'
  let pattern = printf('\%%(.*\%s\|^\)\(.*[^%s%s]\)[%s]*$',
        \ separator, a:chars, separator2, a:chars)
  return get(matchlist(a:full, pattern), 1, '')
endfunction

" @param {string} input_line
" @param {string} chars
" @param {boolean} is_posix
" @return {[
"   string,
"   string,
"   string,
" ]}
function! ddc_file#internal#info(input_line, chars, is_posix) abort
  let input_file_full = s:line_to_file_full(a:input_line, a:is_posix)
  let input_file_base_prefix = s:full_to_base_prefix(
        \ input_file_full, a:chars, a:is_posix)
  let buf_path = expand('%:p')
  return [
        \ input_file_full,
        \ input_file_base_prefix,
        \ buf_path,
        \ ]
endfunction

function! ddc_file#internal#get_pos(input_line, chars) abort
  return match(a:input_line, printf('[%s]*$', a:chars))
endfunction

function! ddc_file#internal#_test() abort
  let isk_s = &isk
  let isf_s = &isf
  let errors_s = v:errors
  try
    let v:errors = []
    let chars = '[:keyword:]'

    " posix
    let &isk = '@,48-57,_,192-255'
    let &isf = '@,48-57,/,.,-,_,+,,,#,$,%,~,='
    call assert_equal('',
          \ s:line_to_file_full('', v:true))
    call assert_equal('.',
          \ s:line_to_file_full('.', v:true))
    call assert_equal('.',
          \ s:line_to_file_full('. .', v:true))
    call assert_equal('abc',
          \ s:line_to_file_full('abc', v:true))
    call assert_equal('bb',
          \ s:line_to_file_full('aa bb', v:true))
    call assert_equal('bb',
          \ s:line_to_file_full('aa bb', v:true))
    call assert_equal('bb/aa',
          \ s:line_to_file_full('aa ff bb/aa', v:true))
    call assert_equal('.bb/aa',
          \ s:line_to_file_full('aa ff .bb/aa', v:true))
    call assert_equal('./bb/aa',
          \ s:line_to_file_full('aa ff ./bb/aa', v:true))
    call assert_equal('../bb/aa',
          \ s:line_to_file_full('aa ff ../bb/aa', v:true))
    call assert_equal('a',
          \ s:line_to_file_full('\a', v:true))
    call assert_equal('./a',
          \ s:line_to_file_full('\./a', v:true))
    call assert_equal('$Foo/bar',
          \ s:line_to_file_full('$Foo/bar', v:true))
    call assert_equal('/bar',
          \ s:line_to_file_full('$Foo /bar', v:true))
    call assert_equal('Foo/bar',
          \ s:line_to_file_full('$ Foo/bar', v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('a', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('abc', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('/abc', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('.', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('.a', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('.abc', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('./abc', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('./', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('//', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('/.', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('./.', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('./.a', chars, v:true))
    call assert_equal('.a.',
          \ s:full_to_base_prefix('./.a.', chars, v:true))
    call assert_equal('.a.',
          \ s:full_to_base_prefix('./.a.b', chars, v:true))
    call assert_equal('.a.b.',
          \ s:full_to_base_prefix('./.a.b.', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('./a', chars, v:true))
    call assert_equal('a.',
          \ s:full_to_base_prefix('./a.', chars, v:true))
    call assert_equal('a.',
          \ s:full_to_base_prefix('./a.b', chars, v:true))
    call assert_equal('a.b.',
          \ s:full_to_base_prefix('./a.b.', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('.', chars, v:true))
    call assert_equal('.',
          \ s:full_to_base_prefix('.a', chars, v:true))
    call assert_equal('.a.',
          \ s:full_to_base_prefix('.a.', chars, v:true))
    call assert_equal('.a.',
          \ s:full_to_base_prefix('.a.b', chars, v:true))
    call assert_equal('.a.b.',
          \ s:full_to_base_prefix('.a.b.', chars, v:true))
    call assert_equal('',
          \ s:full_to_base_prefix('a', chars, v:true))
    call assert_equal('a.',
          \ s:full_to_base_prefix('a.', chars, v:true))
    call assert_equal('a.',
          \ s:full_to_base_prefix('a.b', chars, v:true))
    call assert_equal('a.b.',
          \ s:full_to_base_prefix('a.b.', chars, v:true))
    call assert_equal('a.b.',
          \ s:full_to_base_prefix('a.b.', chars, v:true))

    " win32
    " NOTE: '/' is included as well as '\'.
    let &isk = '@,48-57,_,128-167,224-235'
    let &isf = '@,48-57,/,\,.,-,_,+,,,#,$,%,{,},[,],:,@-@,!,~,='
    call assert_equal('',
          \ s:line_to_file_full('', v:false))
    call assert_equal('.',
          \ s:line_to_file_full('.', v:false))
    call assert_equal('.',
          \ s:line_to_file_full('. .', v:false))
    call assert_equal('abc',
          \ s:line_to_file_full('abc', v:false))
    call assert_equal('bb',
          \ s:line_to_file_full('aa bb', v:false))
    call assert_equal('bb',
          \ s:line_to_file_full('aa bb', v:false))
    call assert_equal('bb\aa',
          \ s:line_to_file_full('aa ff bb\aa', v:false))
    call assert_equal('.bb\aa',
          \ s:line_to_file_full('aa ff .bb\aa', v:false))
    call assert_equal('.\bb\aa',
          \ s:line_to_file_full('aa ff .\bb\aa', v:false))
    call assert_equal('..\bb\aa',
          \ s:line_to_file_full('aa ff ..\bb\aa', v:false))
    call assert_equal('/a',
          \ s:line_to_file_full('/a', v:false))
    call assert_equal('/.\a',
          \ s:line_to_file_full('/.\a', v:false))
    call assert_equal('$Foo/bar',
          \s:line_to_file_full('$Foo/bar', v:false))
    call assert_equal('/bar',
          \s:line_to_file_full('$Foo /bar', v:false))
    call assert_equal('Foo/bar',
          \s:line_to_file_full('$ Foo/bar', v:false))
    call assert_equal('$env:Foo/bar',
          \s:line_to_file_full('$env:Foo/bar', v:false))
    call assert_equal('/root/$env:Foo/bar',
          \ s:line_to_file_full('/root/$env:Foo/bar', v:false))
    call assert_equal('$Env:Foo/bar',
          \s:line_to_file_full('$Env:Foo/bar', v:false))
    call assert_equal('/bar',
          \s:line_to_file_full('$env:Foo /bar', v:false))
    call assert_equal('Foo/bar',
          \s:line_to_file_full('$env: Foo/bar', v:false))
    call assert_equal('',
          \s:full_to_base_prefix('', chars, v:false))
    call assert_equal('',
          \s:full_to_base_prefix('a', chars, v:false))
    call assert_equal('',
          \s:full_to_base_prefix('abc', chars, v:false))
    call assert_equal('',
          \s:full_to_base_prefix('\abc', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('.', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('.a', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('.abc', chars, v:false))
    call assert_equal('',
          \s:full_to_base_prefix('.\abc', chars, v:false))
    call assert_equal('./',
          \s:full_to_base_prefix('./', chars, v:false))
    call assert_equal('',
          \s:full_to_base_prefix('\\', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('\.', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('.\.', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('.\.a', chars, v:false))
    call assert_equal('.a.',
          \s:full_to_base_prefix('.\.a.', chars, v:false))
    call assert_equal('.a.',
          \s:full_to_base_prefix('.\.a.b', chars, v:false))
    call assert_equal('.a.b.',
          \s:full_to_base_prefix('.\.a.b.', chars, v:false))
    call assert_equal('',
          \s:full_to_base_prefix('.\a', chars, v:false))
    call assert_equal('a.',
          \s:full_to_base_prefix('.\a.', chars, v:false))
    call assert_equal('a.',
          \s:full_to_base_prefix('.\a.b', chars, v:false))
    call assert_equal('a.b.',
          \s:full_to_base_prefix('.\a.b.', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('.', chars, v:false))
    call assert_equal('.',
          \s:full_to_base_prefix('.a', chars, v:false))
    call assert_equal('.a.',
          \s:full_to_base_prefix('.a.', chars, v:false))
    call assert_equal('.a.',
          \s:full_to_base_prefix('.a.b', chars, v:false))
    call assert_equal('.a.b.',
          \s:full_to_base_prefix('.a.b.', chars, v:false))
    call assert_equal('',
          \ s:full_to_base_prefix('a', chars, v:false))
    call assert_equal('a.',
          \ s:full_to_base_prefix('a.', chars, v:false))
    call assert_equal('a.',
          \ s:full_to_base_prefix('a.b', chars, v:false))
    call assert_equal('a.b.',
          \ s:full_to_base_prefix('a.b.', chars, v:false))
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
