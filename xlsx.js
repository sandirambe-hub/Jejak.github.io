'use strict';
// Minimal OOXML workbook with typed numbers and inline text; no formulas or external dependencies.
function makeXlsx(sheets){
 const xml=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships',names=Object.keys(sheets),files={};
 files['[Content_Types].xml']='<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+names.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>';
 files['_rels/.rels']=`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
 files['xl/workbook.xml']=`<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets>`+names.map((name,i)=>`<sheet name="${xml(name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>';
 files['xl/_rels/workbook.xml.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+names.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${rel}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>';
 names.forEach((name,i)=>{files[`xl/worksheets/sheet${i+1}.xml`]=`<worksheet xmlns="${ns}"><sheetData>`+sheets[name].map((row,j)=>`<row r="${j+1}">`+row.map((v,k)=>{let col='',idx=k+1;while(idx){col=String.fromCharCode(65+(idx-1)%26)+col;idx=Math.floor((idx-1)/26);}return typeof v==='number'&&Number.isFinite(v)?`<c r="${col}${j+1}"><v>${v}</v></c>`:`<c r="${col}${j+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;}).join('')+'</row>').join('')+'</sheetData></worksheet>';});
 return zipStored(files);
}
function zipStored(files){const enc=new TextEncoder(),chunks=[],central=[];let offset=0;
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 const header=(len,values)=>{const bytes=new Uint8Array(len),view=new DataView(bytes.buffer);for(const [at,size,v]of values)size===4?view.setUint32(at,v,true):view.setUint16(at,v,true);return bytes;};
 for(const [path,text]of Object.entries(files)){const name=enc.encode(path),data=enc.encode(text),sum=crc(data),local=header(30,[[0,4,0x04034b50],[4,2,20],[10,2,0],[12,2,33],[14,4,sum],[18,4,data.length],[22,4,data.length],[26,2,name.length]]);chunks.push(local,name,data);central.push(header(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[14,2,33],[16,4,sum],[20,4,data.length],[24,4,data.length],[28,2,name.length],[42,4,offset]]),name);offset+=local.length+name.length+data.length;}
 const size=central.reduce((s,a)=>s+a.length,0),count=Object.keys(files).length;chunks.push(...central,header(22,[[0,4,0x06054b50],[8,2,count],[10,2,count],[12,4,size],[16,4,offset]]));const result=new Uint8Array(offset+size+22);let pos=0;for(const a of chunks){result.set(a,pos);pos+=a.length;}return result;
}
