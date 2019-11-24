import {assert} from './test-util.js'
import {getFile, testSegment, testSegmentTranslation, testPickOrSkipTags} from './test-util.js'
import {parse} from '../src/index-full.js'


function testBlockResult(output, blockName, results = {}) {
	assert.isObject(output[blockName], `output.${blockName} is undefined`)
	for (let [key, val] of Object.entries(results)) {
		assert.equal(output[blockName][key], val)
	}
}

function testBlock({blockName, definedByDefault, results}) {
	let fileWith = 'IMG_20180725_163423.jpg'
	let fileWithout = 'noexif.jpg'

	describe('enable/disable in options', () => {

		it(`output.${blockName} is undefined when {${blockName}: false}`, async () => {
			let options = {mergeOutput: false, [blockName]: false}
			let input = await getFile(fileWith)
			let output = await parse(input, options) || {}
			assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
		})

		it(`output.${blockName} is undefined when {tiff: false}`, async () => {
			let options = {mergeOutput: false, tiff: false}
			let input = await getFile(fileWith)
			let output = await parse(input, options) || {}
			assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
		})

		if (fileWithout) {
			it(`output.${blockName} is undefined if the file doesn't TIFF despite {${blockName}: false}`, async () => {
				var options = {mergeOutput: false, [blockName]: true}
				var file = await getFile(fileWithout)
				var output = await parse(file, options) || {}
				assert.isUndefined(output[blockName])
			})
			it(`output.${blockName} is undefined if the file doesn't TIFF despite {tiff: false}`, async () => {
				var options = {mergeOutput: false, tiff: true}
				var file = await getFile(fileWithout)
				var output = await parse(file, options) || {}
				assert.isUndefined(output[blockName])
			})
		}

		it(`output.${blockName} is object when {${blockName}: true}`, async () => {
			let options = {mergeOutput: false, [blockName]: true}
			let input = await getFile(fileWith)
			let output = await parse(input, options) || {}
			testBlockResult(output, blockName, results)
		})

		if (definedByDefault) {
			it(`output.${blockName} is object by default`, async () => {
				let options = {mergeOutput: false}
				let input = await getFile(fileWith)
				let output = await parse(input, options) || {}
				testBlockResult(output, blockName, results)
			})
		} else {
			it(`output.${blockName} is undefined by default`, async () => {
				let options = {mergeOutput: false}
				let input = await getFile(fileWith)
				let output = await parse(input, options) || {}
				assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
			})
		}

	})

}

describe('TIFF Segment', () => {

	it(`should handle .tif with scattered TIFF (IFD0 pointing to the end of file)`, async () => {
		let input = await getFile('001.tif')
		let output = await parse(input)
		assert.equal(output.Make, 'DJI')
	})

    it(`IFD0 is ignored and only sifted through for GPS IFD pointer when {ifd0: false, gps: true}`, async () => {
		let input = await getFile('issue-metadata-extractor-152.tif')
		let options = {mergeOutput: false, ifd0: false, gps: true}
        var output = await parse(input, options)
		assert.isUndefined(output.ifd0)
		//assert.isUndefined(output.ifd0.ImageWidth)
		//assert.isUndefined(output.ifd0.Make)
		assert.exists(output.gps)
		assert.exists(output.gps.GPSLatitude)
    })

    it(`random issue {ifd0: false, exif: false, gps: false, interop: false, thumbnail: true}`, async () => {
		let input = await getFile('canon-dslr.jpg')
		let options = {mergeOutput: false, ifd0: false, exif: false, gps: false, interop: false, thumbnail: true}
        var output = await parse(input, options)
		assert.isObject(output)
    })

	// TODO: more tests for .tif

    /*
    import {TiffExifParser} from '../src/parsers/tiff'
    TiffExifParser

    // Exif is scattered throughout the file.
    // Header at the beginning of file, data at the end.
    // tiff offset at 0; ID0 offset at 677442
    it(`scattered file, read/fetch whole file - should succeed 1`, async () => {
        let options = {wholeFile: true}
        let input = getPath('001.tif')
        let output = await parse(input, options)
        assert.equal(output.Make, 'DJI')
    })

	*/

})

describe('TIFF - IFD0 / Image Block', () => {

	testBlock({
		blockName: 'ifd0',
		definedByDefault: true,
		results: {
			Make: 'Google',
			Model: 'Pixel',
		}
	})

	testPickOrSkipTags('ifd0', 'IMG_20180725_163423.jpg', ['Make'], ['Model'])

	testSegmentTranslation({
		type: 'ifd0',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x010F, 'Make',
		]]
	})

})


describe('TIFF - EXIF Block', () => {
	testBlock({
		blockName: 'exif',
		definedByDefault: true,
		results: {
			ExposureTime: 0.000376
		}
	})

	testPickOrSkipTags('exif', 'IMG_20180725_163423.jpg', ['ExposureTime'], ['ISO'])

	testSegmentTranslation({
		type: 'exif',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x9207, 'MeteringMode',
			2, 'CenterWeightedAverage',
		]]
	})

	it(`additional EXIF block test`, async () => {
		let output = await parse(await getFile('img_1771.jpg'))
		assert.equal(output.ApertureValue, 4.65625)
	})
})


describe('TIFF - GPS Block', () => {

	testBlock({
		blockName: 'gps',
		definedByDefault: true,
		results: {
			GPSLatitudeRef: 'N',
			GPSLongitudeRef: 'E',
			GPSDOP: 18,
		}
	})

	testPickOrSkipTags('gps', 'IMG_20180725_163423.jpg', ['GPSLatitude'], ['GPSDateStamp'])

	testSegmentTranslation({
		type: 'gps',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x0001, 'GPSLatitudeRef',
			'N',
		]]
	})

	it(`additional GPS block test 1`, async () => {
		let output = await parse(await getFile('PANO_20180725_162444.jpg'), {mergeOutput: false})
		assert.equal(output.gps.GPSProcessingMethod, 'fused', `output doesn't contain gps`)
	})

	it(`additional GPS block test 2 (practical latitude & longitude in output)`, async () => {
		let output = await parse(await getFile('IMG_20180725_163423.jpg'), {mergeOutput: false})
		assert.equal(output.gps.latitude, 50.29960277777778)
		assert.equal(output.gps.longitude, 14.820294444444444)
	})
})

describe('TIFF - Interop Block', () => {

	testBlock({
		blockName: 'interop',
		definedByDefault: false,
		results: {
			InteropIndex: 'R98'
		}
	})

	testPickOrSkipTags('interop', 'IMG_20180725_163423.jpg', ['InteropIndex'], ['InteropVersion'])

	testSegmentTranslation({
		type: 'interop',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x0001, 'InteropIndex',
		]]
	})

})

// IFD1
describe('TIFF - IFD1 / Thumbnail Block', () => {

	testBlock({
		blockName: 'thumbnail',
		definedByDefault: false,
		results: {
			ImageHeight: 189
		}
	})

	testPickOrSkipTags('thumbnail', 'IMG_20180725_163423.jpg', ['Orientation'], ['ImageHeight'])

	testSegmentTranslation({
		type: 'thumbnail',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x0112, 'Orientation',
			1, 'Horizontal (normal)'
		]]
	})

})