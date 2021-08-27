const { normalize, join } = require('path');
const { parallel, series, watch, dest, src } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');

const normalizePath = relativePath => normalize(join(__dirname, relativePath));

require('dotenv').config();

const customArgs = {
	_: [],
	get(key) {
		if (this.hasOwnProperty(key)) {
			return this[key];
		}

		if (this['_'].includes(key)) {
			return this['_'][key];
		}

		return null;
	},
	has(key) {
		return this.hasOwnProperty(key) || this['_'].includes(key);
	},
	_parseArgs() {
		process.argv
			.splice(3)
			.forEach(customArg => {
				customArg = customArg.toString();

				if (!customArg.startsWith('--')) {
					return;
				}

				const customArgPair = customArg
					.substring(2)
					.split('=')
					.slice(0,2);

				if ( customArgPair.length < 2 ) {
					this['_'].push(customArgPair[0]);
				} else {
					this[customArgPair[0]] = customArgPair[1].split(',');
				}
			});
	}
};

customArgs._parseArgs();

const SASS_PATH	= normalizePath(!!process.env.SASS_PATH ? process.env.SASS_PATH : 'sass');
const CSS_PATH	= normalizePath(!!process.env.CSS_PATH ? process.env.CSS_PATH : 'css');
const JS_PATH	= normalizePath(!!process.env.JS_PATH ? process.env.JS_PATH : 'js');

const GENERAL_SASS_PATTERN	= [`${SASS_PATH}/*.scss`, `${SASS_PATH}/*.sass`];
const GENERAL_CSS_PATTERN	= [`${CSS_PATH}/*.css`, `!${CSS_PATH}/*.min.css`, `!${CSS_PATH}/modules/**/*.min.css`];
const GENERAL_JS_PATTERN	= [`${JS_PATH}/*.js`, `!${JS_PATH}/*.min.js`, `!${JS_PATH}/modules/**/*.min.js`];

const SASS_FILES_PATTERN	= customArgs.has('sass-files') ? customArgs.get('sass-files').map(file => normalizePath(file)) : GENERAL_SASS_PATTERN;
const CSS_FILES_PATTERN		= customArgs.has('css-files') ? customArgs.get('css-files').map(file => normalizePath(file)) : GENERAL_CSS_PATTERN;
const JS_FILES_PATTERN		= customArgs.has('js-files') ? customArgs.get('js-files').map(file => normalizePath(file)) : GENERAL_JS_PATTERN;

function buildSASS() {
	return src(SASS_FILES_PATTERN)
		.pipe(sass.sync().on('error', sass.logError))
		.pipe(dest(CSS_PATH));
}

function buildCSS() {
	return src(CSS_FILES_PATTERN)
		.pipe(sourcemaps.init())
		.pipe(require('gulp-group-css-media-queries')())
		.pipe(require('gulp-clean-css')({
			compatibility: 'ie8',
			level: {
				1: {
					specialComments: 0
				},
				2: {
					removeDuplicateRules: true
				}
			}
		}))
		.pipe(require('gulp-autoprefixer')('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
		.pipe(require('gulp-rename')(path => { path.basename += '.min' }))
		.pipe(sourcemaps.write('./'))
		.pipe(dest(CSS_PATH))
}

function buildJS() {
	return require('gulp-merge')(
		src(JS_FILES_PATTERN),
		src(join(__dirname, 'node_modules', '@babel', 'polyfill', 'browser.js'))
	)
		.pipe(sourcemaps.init())
		.pipe(require('gulp-babel')({
			presets: [
				[
					'@babel/preset-env',
					{ targets: '> 0.10%, not dead' },
				]
			],
			plugins: ['@babel/transform-runtime']
		}))
		.pipe(require('gulp-uglify')())
		.pipe(require('gulp-rename')(path => { path.basename += '.min'; }))
		.pipe(sourcemaps.write('./'))
		.pipe(dest(JS_PATH));
}

function dev() {
	if (customArgs.has('only-selected')) {
		watch(SASS_FILES_PATTERN, buildSASS);
	} else {
		watch(GENERAL_SASS_PATTERN, buildSASS);
	}
}

exports.buildSASS = buildSASS;
// exports.buildCSS = series(buildSASS, buildCSS);
exports.buildCSS = buildCSS;
exports.buildJS = buildJS;
exports.dev = dev;
exports.build = parallel(series(buildSASS, buildCSS), buildJS);