import {
	getUint8,
	getUint16,
	getUint32,
	getInt8,
	getInt16,
	getInt32,
	slice,
	toString,
	BufferCursor
} from '../buff-util.mjs'


/*
offset = where FF En starts
length = size of the whole appN segment (header/marker + content)
start  = start of the content
size   = size of the content. i.e. from start till end
end    = end of the content (as well as the appN segment)
*/
export class AppSegment {

	static headerLength = 4

	static canHandle = () => false

	constructor(buffer, position, options) {
		Object.assign(this, position)
		this.buffer = buffer
		this.options = options
	}

	// offset + length === end  |  begining and end of the whole segment, including the segment header 0xFF 0xEn + two lenght bytes.
	// start  + size   === end  |  begining and end of parseable content
	static parsePosition(buffer, offset) {
		// length at offset+2 is the size of appN content plus the two appN length bytes. it does not include te appN 0xFF 0xEn marker.
		var length = getUint16(buffer, offset + 2) + 2
		var start = offset + this.headerLength
		var size = length - this.headerLength
		var end = start + size
		return {offset, length, start, size, end}
	}

}

export var parsers = {}