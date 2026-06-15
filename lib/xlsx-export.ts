export type XlsxCellValue = string | number;

type XlsxWorkbookOptions = {
  columnWidth?: number;
  rows: XlsxCellValue[][];
  sheetName?: string;
};

const DEFAULT_COLUMN_WIDTH = 16.86;
const WRAPPED_CELL_STYLE = 1;
const HEADER_CELL_STYLE = 2;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;
const ZIP_VERSION = 20;
const DOS_TIME = 0;
const DOS_DATE = 33;
const CRC32_TABLE = createCrc32Table();

export function buildXlsxWorkbook({
  columnWidth = DEFAULT_COLUMN_WIDTH,
  rows,
  sheetName = "Report"
}: XlsxWorkbookOptions) {
  const normalizedRows = rows.length > 0 ? rows : [[""]];
  const maxColumnCount = Math.max(1, ...normalizedRows.map((row) => row.length));
  const safeSheetName = sanitizeSheetName(sheetName);

  return zipFiles([
    { path: "[Content_Types].xml", data: buildContentTypesXml() },
    { path: "_rels/.rels", data: buildRootRelationshipsXml() },
    { path: "docProps/app.xml", data: buildAppPropertiesXml(safeSheetName) },
    { path: "docProps/core.xml", data: buildCorePropertiesXml() },
    { path: "xl/workbook.xml", data: buildWorkbookXml(safeSheetName) },
    { path: "xl/_rels/workbook.xml.rels", data: buildWorkbookRelationshipsXml() },
    { path: "xl/styles.xml", data: buildStylesXml() },
    {
      path: "xl/worksheets/sheet1.xml",
      data: buildWorksheetXml(normalizedRows, maxColumnCount, columnWidth)
    }
  ]);
}

function buildContentTypesXml() {
  return xmlDocument(`\
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);
}

function buildRootRelationshipsXml() {
  return xmlDocument(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function buildAppPropertiesXml(sheetName: string) {
  return xmlDocument(`\
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Channel Pulse</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>${escapeXml(sheetName)}</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`);
}

function buildCorePropertiesXml() {
  const createdAt = new Date().toISOString();

  return xmlDocument(`\
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Channel Pulse</dc:creator>
  <cp:lastModifiedBy>Channel Pulse</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`);
}

function buildWorkbookXml(sheetName: string) {
  return xmlDocument(`\
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="false"/>
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="16384" windowHeight="8192"/>
  </bookViews>
  <sheets>
    <sheet name="${escapeXmlAttribute(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);
}

function buildWorkbookRelationshipsXml() {
  return xmlDocument(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
}

function buildStylesXml() {
  return xmlDocument(`\
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`);
}

function buildWorksheetXml(rows: XlsxCellValue[][], maxColumnCount: number, columnWidth: number) {
  const lastCellReference = `${columnName(maxColumnCount)}${rows.length}`;
  const cols = Array.from({ length: maxColumnCount }, (_, index) => {
    const columnNumber = index + 1;
    return `<col min="${columnNumber}" max="${columnNumber}" width="${columnWidth}" customWidth="1"/>`;
  }).join("");
  const rowXml = rows.map((row, index) => buildRowXml(row, index + 1, columnWidth)).join("");
  const autoFilter = rows.length > 1 ? `<autoFilter ref="A1:${lastCellReference}"/>` : "";

  return xmlDocument(`\
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCellReference}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${cols}</cols>
  <sheetData>${rowXml}</sheetData>
  ${autoFilter}
</worksheet>`);
}

function buildRowXml(row: XlsxCellValue[], rowNumber: number, columnWidth: number) {
  const height = estimateRowHeight(row, columnWidth);
  const heightAttribute = height ? ` ht="${height}" customHeight="1"` : "";
  const cells = row.map((value, columnIndex) => buildCellXml(value, columnIndex + 1, rowNumber)).join("");

  return `<row r="${rowNumber}"${heightAttribute}>${cells}</row>`;
}

function buildCellXml(value: XlsxCellValue, columnNumber: number, rowNumber: number) {
  const cellReference = `${columnName(columnNumber)}${rowNumber}`;
  const style = rowNumber === 1 ? HEADER_CELL_STYLE : WRAPPED_CELL_STYLE;

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${cellReference}" s="${style}"><v>${value}</v></c>`;
  }

  const text = normalizeXmlText(String(value));
  const preserveSpace = /^\s|\s$|\s{2,}/.test(text);
  const spaceAttribute = preserveSpace ? ' xml:space="preserve"' : "";

  return `<c r="${cellReference}" t="inlineStr" s="${style}"><is><t${spaceAttribute}>${escapeXml(text)}</t></is></c>`;
}

function estimateRowHeight(row: XlsxCellValue[], columnWidth: number) {
  const approximateCharactersPerLine = Math.max(8, Math.floor(columnWidth * 1.2));
  const maxLineCount = row.reduce<number>((maxLineCount, value) => {
    if (typeof value === "number") return maxLineCount;

    const lineCount = normalizeXmlText(value)
      .split(/\n/)
      .reduce(
        (total, line) => total + Math.max(1, Math.ceil(line.length / approximateCharactersPerLine)),
        0
      );
    return Math.max(maxLineCount, lineCount);
  }, 1);

  return maxLineCount > 1 ? Math.min(120, maxLineCount * 15) : null;
}

function columnName(columnNumber: number) {
  let name = "";
  let remaining = columnNumber;

  while (remaining > 0) {
    remaining -= 1;
    name = String.fromCharCode(65 + (remaining % 26)) + name;
    remaining = Math.floor(remaining / 26);
  }

  return name;
}

function zipFiles(entries: Array<{ data: string | Buffer; path: string }>) {
  const chunks: Buffer[] = [];
  const centralDirectoryChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path, "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(ZIP_VERSION, 4);
    localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
    localHeader.writeUInt16LE(ZIP_STORE_METHOD, 8);
    localHeader.writeUInt16LE(DOS_TIME, 10);
    localHeader.writeUInt16LE(DOS_DATE, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    chunks.push(localHeader, fileName, data);

    const centralDirectoryHeader = Buffer.alloc(46);
    centralDirectoryHeader.writeUInt32LE(0x02014b50, 0);
    centralDirectoryHeader.writeUInt16LE(ZIP_VERSION, 4);
    centralDirectoryHeader.writeUInt16LE(ZIP_VERSION, 6);
    centralDirectoryHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
    centralDirectoryHeader.writeUInt16LE(ZIP_STORE_METHOD, 10);
    centralDirectoryHeader.writeUInt16LE(DOS_TIME, 12);
    centralDirectoryHeader.writeUInt16LE(DOS_DATE, 14);
    centralDirectoryHeader.writeUInt32LE(checksum, 16);
    centralDirectoryHeader.writeUInt32LE(data.length, 20);
    centralDirectoryHeader.writeUInt32LE(data.length, 24);
    centralDirectoryHeader.writeUInt16LE(fileName.length, 28);
    centralDirectoryHeader.writeUInt16LE(0, 30);
    centralDirectoryHeader.writeUInt16LE(0, 32);
    centralDirectoryHeader.writeUInt16LE(0, 34);
    centralDirectoryHeader.writeUInt16LE(0, 36);
    centralDirectoryHeader.writeUInt32LE(0, 38);
    centralDirectoryHeader.writeUInt32LE(offset, 42);

    centralDirectoryChunks.push(centralDirectoryHeader, fileName);
    offset += localHeader.length + fileName.length + data.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralDirectoryChunks);
  const endOfCentralDirectory = Buffer.alloc(22);

  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralDirectory, endOfCentralDirectory]);
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let checksum = index;
    for (let bit = 0; bit < 8; bit += 1) {
      checksum = checksum & 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
    }
    table[index] = checksum >>> 0;
  }

  return table;
}

function crc32(buffer: Buffer) {
  let checksum = 0xffffffff;

  for (const byte of buffer) {
    checksum = CRC32_TABLE[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}

function xmlDocument(content: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${content}`;
}

function sanitizeSheetName(value: string) {
  const sheetName = value
    .replace(/[\[\]:*?/\\]/g, " ")
    .replace(/^'+|'+$/g, "")
    .trim()
    .slice(0, 31);

  return sheetName || "Report";
}

function normalizeXmlText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd]/g, "");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlAttribute(value: string) {
  return escapeXml(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
