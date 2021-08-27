# Tasks

## Compiling SASS Files

```shell script
gulp buildSASS
```

### Building only selected sass files

```shell script
gulp buildSASS --sass-files=sass/file.scss,sass/file1.scss
```

## CSS optimization, minify

```shell script
gulp buildCSS --css-files=css/file.css,css/file1.css
```

## JavaScript optimization, minify

```shell script
gulp buildJS --js-files=js/file.js,js/file1.js
```

## Watching and building the .scss and .sass files

```shell script
gulp dev
```

### Watching and building only selected files

```shell script
gulp dev --sass-files=sass/file.scss,sass/file1.scss
```

### Watching and building only selected files when they have only been changed

```shell script
gulp dev --sass-files=sass/file.scss,sass/file1.scss --only-selected
```

## CSS and Javascript optimization, minify

```shell script
gulp build
```
