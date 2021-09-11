# ddc-file

[![Doc](https://img.shields.io/badge/doc-%3Ah%20ddc--file-orange.svg?style=flat-square)](doc/ddc-file.txt)

Powerful and performant file name completion for ddc.vim.

## Required

- [denops.vim](https://github.com/vim-denops/denops.vim)
- [ddc.vim](https://github.com/Shougo/ddc.vim)

## Configuration

```vim
call ddc#custom#patch_global('sources', ['file'])
call ddc#custom#patch_global('sourceOptions', {
    \ 'file': {
    \   'mark': 'F',
    \   'isVolatile': v:true,
    \ }})
call ddc#custom#patch_filetype(
    \ ['ps1', 'dosbatch', 'autohotkey', 'registry'],
    \ 'sourceParams', {
    \   'file': {
    \     'mode': 'win32',
    \   },
    \ })
```
