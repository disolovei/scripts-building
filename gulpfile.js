const { normalize, join } = require('path');
const { parallel, series, watch, dest, src } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');
const executeIfProd	= require('gulp-if');
const clean = require('gulp-clean');

const normalizePath = relativePath => normalize(join(__dirname, relativePath));
const getENVOption	= (name, defaultValue = '') => !!process.env[name] ? process.env[name] : defaultValue;

require('dotenv').config();

const customArgs = {
	_: [],
	get(key, defaultValue = null) {
		if (this.hasOwnProperty(key)) {
			return this[key];
		}

		if (this['_'].includes(key)) {
			return this['_'][key];
		}

		return defaultValue;
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

const IS_IN_PRODUCTION = customArgs.has('prod') || ( !!process.env.ENVIRONMENT && 'production' === process.env.ENVIRONMENT );

const SASS_SRC_PATH	= normalizePath(getENVOption('SASS_SRC_PATH', 'sass'));
const CSS_DEST_PATH	= normalizePath(getENVOption('CSS_DEST_PATH', 'css'));
const JS_DEST_PATH	= normalizePath(getENVOption('JS_DEST_PATH', 'js'));

const JS_SRC_PATH = getENVOption('JS_SRC_PATH', JS_DEST_PATH);

const MAKE_DOT_MIN_FILES = !!getENVOption('MAKE_DOT_MIN_FILES', '');

const GENERAL_SASS_PATTERN	= [`${SASS_SRC_PATH}/*.scss`, `${SASS_SRC_PATH}/*.sass`];
const GENERAL_CSS_PATTERN	= [`${CSS_DEST_PATH}/*.css`, `!${CSS_DEST_PATH}/*.min.css`, `!${CSS_DEST_PATH}/modules/**/*.min.css`];
const GENERAL_JS_PATTERN	= [`${JS_SRC_PATH}/*.js`, `!${JS_SRC_PATH}/*.min.js`, `!${JS_SRC_PATH}/modules/**/*.min.js`];

const SASS_FILES_PATTERN	= customArgs.has('sass-files') ? customArgs.get('sass-files').map(file => normalizePath(file)) : GENERAL_SASS_PATTERN;
const CSS_FILES_PATTERN		= customArgs.has('css-files') ? customArgs.get('css-files').map(file => normalizePath(file)) : GENERAL_CSS_PATTERN;
const JS_FILES_PATTERN		= customArgs.has('js-files') ? customArgs.get('js-files').map(file => normalizePath(file)) : GENERAL_JS_PATTERN;

function buildSASS() {
	return src(SASS_FILES_PATTERN)
		.pipe(sass.sync().on('error', sass.logError))
		.pipe(dest(CSS_DEST_PATH));
}

function buildCSS() {
	return src(CSS_FILES_PATTERN)
		.pipe(executeIfProd(!IS_IN_PRODUCTION, sourcemaps.init()))
		.pipe(executeIfProd(IS_IN_PRODUCTION, require('gulp-group-css-media-queries')()))
		.pipe(executeIfProd(IS_IN_PRODUCTION, require('gulp-clean-css')({
			compatibility: 'ie8',
			level: {
				1: {
					specialComments: 0
				},
				2: {
					removeDuplicateRules: true
				}
			}
		})))
		.pipe(executeIfProd(IS_IN_PRODUCTION, require('gulp-autoprefixer')('last 2 version', 'safari 5', 'ie 8', 'ie 9')))
		.pipe(executeIfProd(IS_IN_PRODUCTION && MAKE_DOT_MIN_FILES, require('gulp-rename')(path => { path.basename += '.min'; })))
		.pipe(executeIfProd(!IS_IN_PRODUCTION, sourcemaps.write('./')))
		.pipe(dest(CSS_DEST_PATH))
}

function buildJS() {
	return require('gulp-merge')(
		src(JS_FILES_PATTERN),
		src(join(__dirname, 'node_modules', '@babel', 'polyfill', 'browser.js'))
	)
		.pipe(executeIfProd(!IS_IN_PRODUCTION, sourcemaps.init()))
		.pipe(executeIfProd(IS_IN_PRODUCTION, require('gulp-babel')({
			presets: [
				[
					'@babel/preset-env',
					{ targets: '> 0.10%, not dead' },
				]
			],
			plugins: ['@babel/transform-runtime']
		})))
		.pipe(executeIfProd(IS_IN_PRODUCTION, require('gulp-uglify')()))
		.pipe(executeIfProd(IS_IN_PRODUCTION && MAKE_DOT_MIN_FILES, require('gulp-rename')(path => { path.basename += '.min'; })))
		.pipe(executeIfProd(!IS_IN_PRODUCTION, sourcemaps.write('./')))
		.pipe(dest(JS_DEST_PATH));
}

function cleanCSS() {
	return src(CSS_DEST_PATH, {
		read: false,
		allowEmpty: true
	})
		.pipe(clean({ force: true }));
}

function cleanJS() {
	return src(JS_DEST_PATH, {
		read: false,
		allowEmpty: true
	})
		.pipe(clean({ force: true }));
}

function dev() {
	if (customArgs.has('only-selected')) {
		watch(SASS_FILES_PATTERN, buildSASS);
	} else {
		watch(GENERAL_SASS_PATTERN, buildSASS);
	}
}

exports.buildSASS = series(cleanCSS, buildSASS);
// exports.buildCSS = series(buildSASS, buildCSS);
exports.buildCSS = buildCSS;
exports.buildJS = series(cleanJS, buildJS);
exports.dev = dev;
exports.clean = dev;
exports.build = parallel(series(cleanCSS, buildSASS, buildCSS), series(cleanJS, buildJS));
