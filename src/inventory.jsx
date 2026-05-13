import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// SHARED STORAGE
// ═══════════════════════════════════════════════════════
const SHARED = true;
const KEY_IWA   = "iwa_stock_v6";
const KEY_UNIF  = "unif_stock_v6";
const KEY_ILOGS = "iwa_logs_v6";
const KEY_ULOGS = "unif_logs_v6";
const POLL_MS   = 4000;

async function sGet(key) {
  try { const r = await window.storage.get(key, SHARED); if (r?.value) return JSON.parse(r.value); } catch(e){}
  return null;
}
async function sSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val), SHARED); } catch(e){}
}

// ═══════════════════════════════════════════════════════
// THEME — สีตรงโลโก้แต่ละร้าน
// iwa spa shop   : ทอง + เขียวเข้ม (ใบไม้+วงแหวนทอง)
// ไอวาร์ยูนิฟอร์ม: ทอง + น้ำตาลทอง (WA สีทอง+น้ำตาล)
// ═══════════════════════════════════════════════════════
const THEMES = {
  iwa: {
    name:"iwa spa shop", emoji:"🌿",
    // เขียวเข้มจากโลโก้ IWA SPA
    g1:"#1A4D2E", g2:"#2D6E44",
    gold1:"#C9912A", gold2:"#E8B84B", gold3:"#F5D98A", gold4:"#FDF3D0",
    accent:"#2D6E44", accentLight:"#D4EDDA",
    bg:"#F7FBF7", card:"#FFFFFF", border:"#B8D9C0",
    text1:"#0D2B18", text2:"#1A4D2E", text3:"#5A8A6A",
    tagBg:"#D4EDDA", tagText:"#1A4D2E",
    catColors:{
      "👚":{a:"#1A4D2E",b:"#2D6E44"},
      "👗":{a:"#3A7D44",b:"#2D6E44"},
      "👖":{a:"#4A9B6A",b:"#2D6E44"},
      "👟":{a:"#C9912A",b:"#A07020"},
      "🧴":{a:"#7B8D6E",b:"#5A6B50"},
    },
  },
  uniform: {
    name:"ไอวาร์ยูนิฟอร์ม", emoji:"👔",
    // น้ำเงินเข้ม + ทอง — ตัวอักษรขาวชัด
    g1:"#0D2B5E", g2:"#1A4A9E",
    gold1:"#E8B84B", gold2:"#F5D98A", gold3:"#FFF0B3", gold4:"#FFFBEE",
    accent:"#1A4A9E", accentLight:"#E8F0FF",
    bg:"#F0F4FF",       // ฟ้าอ่อนมาก
    card:"#FFFFFF",
    border:"#B8CFFF",
    text1:"#FFFFFF",    // ขาว — อ่านบนพื้นน้ำเงิน
    text2:"#0D2B5E",    // น้ำเงินเข้ม — อ่านบนพื้นขาว/ครีม
    text3:"#3A5A9E",    // น้ำเงินกลาง
    tagBg:"#D0E4FF", tagText:"#0D2B5E",
    catColors:{
      "👚":{a:"#0D2B5E",b:"#1A4A9E"},
      "👗":{a:"#1A3A8E",b:"#2A5AAE"},
      "👖":{a:"#0A2050",b:"#163A80"},
      "👟":{a:"#0D5E3E",b:"#1A9E6A"},
      "🧴":{a:"#2A3A6E",b:"#3A4A8E"},
    },
  },
};

const LOCS_IWA  = ["ซ้ายบน","ขวาบน","ซ้ายล่าง","ขวาล่าง","สต๊อกแยก","สต๊อกเพิ่มเติม"];
const LOCS_UNIF = []; // ไอวาร์ยูนิฟอร์มไม่ใช้ตำแหน่ง
const getLocs = s => s==="iwa" ? LOCS_IWA : LOCS_UNIF;

const SIZES = ["S","M","L","XL","2XL","3XL"];
const CATS  = ["👚 เสื้อ","👗 เดรส","👖 กางเกง","👟 รองเท้า","🧴 สินค้าอื่น"];
const sChip = {
  S:{bg:"#DBEAFE",tc:"#1E40AF"},M:{bg:"#D1FAE5",tc:"#065F46"},
  L:{bg:"#FEF3C7",tc:"#92400E"},XL:{bg:"#FFEDD5",tc:"#9A3412"},
  "2XL":{bg:"#FEE2E2",tc:"#991B1B"},"3XL":{bg:"#EDE9FE",tc:"#5B21B6"},
};
const mk = (o={}) => { const r={}; for(const s of SIZES) r[s]=o[s]||0; return r; };
let _uid=9000; const genId=()=>`item_${++_uid}_${Date.now()}`;
const totalSz = sz => Object.values(sz).reduce((a,b)=>a+(b||0),0);
const nowStr  = () => new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"});
const todayStr  = () => new Date().toLocaleDateString("th-TH");
const todayFull = () => new Date().toLocaleDateString("th-TH",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

// ═══════════════════════════════════════════════════════
// DEFAULT IWA SPA STOCK
// ═══════════════════════════════════════════════════════
const DEF_IWA = [
  {id:"i_lb1", name:"คอปีน",cat:"👚 เสื้อ",color:"น้ำตาล",sizes:mk({XL:4}),loc:"ซ้ายบน",note:""},
  {id:"i_lb2", name:"คอปีน",cat:"👚 เสื้อ",color:"ส้ม",sizes:mk({M:2}),loc:"ซ้ายบน",note:""},
  {id:"i_lb3", name:"คอปีน",cat:"👚 เสื้อ",color:"เหลือง",sizes:mk({M:2}),loc:"ซ้ายบน",note:""},
  {id:"i_lb4", name:"คอวี",cat:"👚 เสื้อ",color:"ดำ",sizes:mk({M:1,L:1,"2XL":2}),loc:"ซ้ายบน",note:""},
  {id:"i_lb5", name:"คอวี",cat:"👚 เสื้อ",color:"เลือดหมู",sizes:mk({S:2}),loc:"ซ้ายบน",note:""},
  {id:"i_lb6", name:"คอวี",cat:"👚 เสื้อ",color:"ไพร",sizes:mk({XL:1}),loc:"ซ้ายบน",note:""},
  {id:"i_lb7", name:"คอวี",cat:"👚 เสื้อ",color:"ฟ้า",sizes:mk({XL:1}),loc:"ซ้ายบน",note:""},
  {id:"i_lb8", name:"เดรสสีพื้น",cat:"👗 เดรส",color:"เขียว Pastel",sizes:mk({S:1,L:1,XL:1}),loc:"ซ้ายบน",note:""},
  {id:"i_lb9", name:"เดรสแดงสดแต่งขาว",cat:"👗 เดรส",color:"แดงสด",sizes:mk({L:1}),loc:"ซ้ายบน",note:""},
  {id:"i_lb10",name:"เดรสชมพูแต่งขาว",cat:"👗 เดรส",color:"ชมพู",sizes:mk({L:1}),loc:"ซ้ายบน",note:""},
  {id:"i_rb1", name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"น้ำเงิน",sizes:mk({M:1}),loc:"ขวาบน",note:""},
  {id:"i_rb2", name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"พาสเทล",sizes:mk({XL:1}),loc:"ขวาบน",note:""},
  {id:"i_rb3", name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ม่วง",sizes:mk({M:1}),loc:"ขวาบน",note:""},
  {id:"i_rb4", name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"น้ำตาล",sizes:mk({L:1,"2XL":3}),loc:"ขวาบน",note:""},
  {id:"i_rb5", name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"เลือดหมู",sizes:mk({"2XL":1,"3XL":1}),loc:"ขวาบน",note:""},
  {id:"i_rb6", name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ดำ",sizes:mk({S:2,M:2,L:1}),loc:"ขวาบน",note:""},
  {id:"i_rb7", name:"คอตั้ง",cat:"👚 เสื้อ",color:"เหลืองไพร",sizes:mk({M:1}),loc:"ขวาบน",note:""},
  {id:"i_rb8", name:"คอตั้ง",cat:"👚 เสื้อ",color:"ม่วงอ่อน",sizes:mk({XL:1}),loc:"ขวาบน",note:""},
  {id:"i_rb9", name:"ผูกเอว",cat:"👚 เสื้อ",color:"เหลืองไพร",sizes:mk({M:1}),loc:"ขวาบน",note:""},
  {id:"i_rb10",name:"ผูกเอว",cat:"👚 เสื้อ",color:"เขียว",sizes:mk({S:1}),loc:"ขวาบน",note:""},
  {id:"i_ll1", name:"เสื้อยืดลายไทยคาดตรง",cat:"👚 เสื้อ",color:"ทั่วไป",sizes:mk({M:2,L:2,XL:1}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll2", name:"เสื้อยืดลายไทยคาดตรง",cat:"👚 เสื้อ",color:"ชมพู",sizes:mk({L:1}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll3", name:"เสื้อยืดลายไทยคาดตรง",cat:"👚 เสื้อ",color:"บานเย็น",sizes:mk({L:1}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll4", name:"เสื้อยืดลายไทยคาดตรง",cat:"👚 เสื้อ",color:"แดง",sizes:mk({M:1}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll5", name:"เสื้อยืดลายไทยคาดตรง",cat:"👚 เสื้อ",color:"ม่วงแต่งม่วงอ่อน",sizes:mk({S:2}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll6", name:"เสื้อยืดลายไทยคาดตรง",cat:"👚 เสื้อ",color:"ฟ้าเข้มแต่งฟ้าอ่อน",sizes:mk({M:2}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll7", name:"เสื้อยืดลายไทยคาดเฉียง",cat:"👚 เสื้อ",color:"น้ำตาล",sizes:mk({XL:4}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll8", name:"เสื้อยืดลายไทยคาดเฉียง",cat:"👚 เสื้อ",color:"ม่วง",sizes:mk({M:1,L:1}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll9", name:"คอจีนคาดกลาง",cat:"👚 เสื้อ",color:"ส้ม",sizes:mk({M:2}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll10",name:"คอจีน",cat:"👚 เสื้อ",color:"ชมพู",sizes:mk({L:2}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll11",name:"คอจีน",cat:"👚 เสื้อ",color:"ม่วงอ่อน",sizes:mk({XL:1}),loc:"ซ้ายล่าง",note:""},
  {id:"i_ll12",name:"คอจีน",cat:"👚 เสื้อ",color:"ดำ",sizes:mk({"2XL":1}),loc:"ซ้ายล่าง",note:""},
  {id:"i_rl1", name:"กางเกงตุ้งติ้ง",cat:"👖 กางเกง",color:"น้ำตาล",sizes:mk({M:2}),loc:"ขวาล่าง",note:""},
  {id:"i_rl2", name:"กางเกงแต่งลายไทย",cat:"👖 กางเกง",color:"เขียวมะนาว",sizes:mk({M:2,L:1}),loc:"ขวาล่าง",note:""},
  {id:"i_rl3", name:"กางเกงแต่งลายไทย",cat:"👖 กางเกง",color:"น้ำตาล",sizes:mk({S:1}),loc:"ขวาล่าง",note:""},
  {id:"i_rl4", name:"กางเกงแต่งลายไทย",cat:"👖 กางเกง",color:"เลือดหมู",sizes:mk({XL:1}),loc:"ขวาล่าง",note:""},
  {id:"i_rl5", name:"กางเกงตุ้งติ้ง",cat:"👖 กางเกง",color:"บานเย็น",sizes:mk({L:1}),loc:"ขวาล่าง",note:""},
  {id:"i_rl6", name:"กางเกงตุ้งติ้ง",cat:"👖 กางเกง",color:"เลือดหมู",sizes:mk({M:2}),loc:"ขวาล่าง",note:""},
  {id:"i_rl7", name:"กางเกงพื้น",cat:"👖 กางเกง",color:"ดำ",sizes:mk({XL:1}),loc:"ขวาล่าง",note:""},
  {id:"i_sp1", name:"เดรสนางฟ้าแต่งลายไทย",cat:"👗 เดรส",color:"น้ำตาล",sizes:mk({XL:1}),loc:"สต๊อกแยก",note:""},
  {id:"i_sp2", name:"เดรสสีพื้นนางฟ้า",cat:"👗 เดรส",color:"ชมพูกลีบบัวแต่งดำ",sizes:mk({"2XL":1}),loc:"สต๊อกแยก",note:""},
  {id:"i_sp3", name:"เดรสทูโทน",cat:"👗 เดรส",color:"ฟ้า",sizes:mk({XL:1}),loc:"สต๊อกแยก",note:""},
  {id:"i_sp4", name:"เดรสตุ้งติ้ง",cat:"👗 เดรส",color:"บานเย็น",sizes:mk({M:2}),loc:"สต๊อกแยก",note:""},
  {id:"i_sp5", name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"ดำ",sizes:mk({S:1,L:1}),loc:"สต๊อกแยก",note:""},
];

// ═══════════════════════════════════════════════════════
// DEFAULT UNIFORM STOCK — อัพเดทล่าสุด
// ═══════════════════════════════════════════════════════
const DEF_UNIF = [
  // คอปีน
  {id:"u_kp01",name:"คอปีน",cat:"👚 เสื้อ",color:"เขียว",   sizes:mk({M:2,L:5,XL:5}),                     loc:"สต๊อกแยก",note:""},
  {id:"u_kp02",name:"คอปีน",cat:"👚 เสื้อ",color:"กรม",     sizes:mk({XL:2}),                              loc:"สต๊อกแยก",note:""},
  {id:"u_kp03",name:"คอปีน",cat:"👚 เสื้อ",color:"ม่วง",    sizes:mk({S:2,M:9,L:4}),                       loc:"สต๊อกแยก",note:""},
  {id:"u_kp04",name:"คอปีน",cat:"👚 เสื้อ",color:"ส้มไพร",  sizes:mk({XL:1,"2XL":1}),                      loc:"สต๊อกแยก",note:""},
  {id:"u_kp05",name:"คอปีน",cat:"👚 เสื้อ",color:"ชาไทย",   sizes:mk({L:1}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_kp06",name:"คอปีน",cat:"👚 เสื้อ",color:"น้ำตาล",     sizes:mk({S:1,M:1,XL:3,"2XL":1}),             loc:"สต๊อกแยก",note:""},
  {id:"u_kp07",name:"คอปีน",cat:"👚 เสื้อ",color:"เลือด",   sizes:mk({S:1,L:3,XL:1,"2XL":5,"3XL":2}),     loc:"สต๊อกแยก",note:""},
  {id:"u_kp08",name:"คอปีน",cat:"👚 เสื้อ",color:"ครีม",    sizes:mk({S:5,M:3,L:3,"2XL":3,"3XL":6}),      loc:"สต๊อกแยก",note:""},
  {id:"u_kp09",name:"คอปีน",cat:"👚 เสื้อ",color:"ดำ",      sizes:mk({S:1,M:2,"3XL":1}),                  loc:"สต๊อกแยก",note:""},
  {id:"u_kp10",name:"คอปีน",cat:"👚 เสื้อ",color:"ไพร",     sizes:mk({S:1,L:3,XL:1,"2XL":3}),             loc:"สต๊อกแยก",note:""},
  {id:"u_kp11",name:"คอปีน",cat:"👚 เสื้อ",color:"มิ้น",    sizes:mk({S:1,M:3,L:4,XL:4,"2XL":1,"3XL":2}), loc:"สต๊อกแยก",note:""},
  {id:"u_kp12",name:"คอปีน",cat:"👚 เสื้อ",color:"ชมพู",    sizes:mk({L:1}),                               loc:"สต๊อกแยก",note:""},
  // ผูกเอว
  {id:"u_pe01",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ดำ",     sizes:mk({S:1,M:3,"2XL":3,"3XL":1}),          loc:"สต๊อกแยก",note:"S=สจ"},
  {id:"u_pe02",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ขาว",    sizes:mk({S:1}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_pe03",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ฟ้า",    sizes:mk({S:1}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_pe04",name:"ผูกเอว",cat:"👚 เสื้อ",color:"แดงสด",  sizes:mk({S:2,M:1,L:1,XL:1,"2XL":1,"3XL":2}), loc:"สต๊อกแยก",note:""},
  {id:"u_pe05",name:"ผูกเอว",cat:"👚 เสื้อ",color:"บาน",    sizes:mk({S:1,M:2,L:2,XL:1,"2XL":2}),         loc:"สต๊อกแยก",note:""},
  {id:"u_pe06",name:"ผูกเอว",cat:"👚 เสื้อ",color:"เทาอ่อน",sizes:mk({S:1}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_pe07",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ไพร",    sizes:mk({M:1,L:2,XL:5,"2XL":2,"3XL":2}),    loc:"สต๊อกแยก",note:""},
  {id:"u_pe08",name:"ผูกเอว",cat:"👚 เสื้อ",color:"เขียว",  sizes:mk({M:3,L:3,XL:2}),                     loc:"สต๊อกแยก",note:""},
  {id:"u_pe09",name:"ผูกเอว",cat:"👚 เสื้อ",color:"เลือด",  sizes:mk({M:4,L:5,XL:2}),                     loc:"สต๊อกแยก",note:"M2สจ XL1สจ"},
  {id:"u_pe10",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ชมอ่อน", sizes:mk({M:1,L:3,XL:2,"2XL":1}),             loc:"สต๊อกแยก",note:""},
  {id:"u_pe11",name:"ผูกเอว",cat:"👚 เสื้อ",color:"น้ำตาล",    sizes:mk({M:1,XL:2}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_pe12",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ม่วง",   sizes:mk({M:0,L:2,XL:3,"2XL":2,"3XL":4}),    loc:"สต๊อกแยก",note:""},
  {id:"u_pe13",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ตอง",    sizes:mk({M:2,L:2,XL:1,"3XL":3}),             loc:"สต๊อกแยก",note:""},
  {id:"u_pe14",name:"ผูกเอว",cat:"👚 เสื้อ",color:"โอรส",   sizes:mk({L:1,XL:1,"2XL":2}),                 loc:"สต๊อกแยก",note:""},
  {id:"u_pe15",name:"ผูกเอว",cat:"👚 เสื้อ",color:"น้ำเงิน",sizes:mk({XL:1,"2XL":2,"3XL":1}),             loc:"สต๊อกแยก",note:""},
  {id:"u_pe16",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ส้ม",    sizes:mk({XL:2}),                              loc:"สต๊อกแยก",note:""},
  {id:"u_pe17",name:"ผูกเอว",cat:"👚 เสื้อ",color:"ชมหวาน", sizes:mk({XL:2,"3XL":2}),                      loc:"สต๊อกแยก",note:""},
  // ตุ้งติ้ง
  {id:"u_tt01",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"เลือด",    sizes:mk({S:2,M:4,L:5,XL:4,"2XL":1,"3XL":2}),loc:"สต๊อกแยก",note:"XL4/M4/3XL2=สจ L2=จร S2/L3=ฟส"},
  {id:"u_tt02",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ครีม",     sizes:mk({L:1,XL:1,"2XL":7,"3XL":3}),         loc:"สต๊อกแยก",note:""},
  {id:"u_tt03",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ฟ้า",      sizes:mk({"2XL":1,"3XL":4}),                   loc:"สต๊อกแยก",note:"3XL=จร"},
  {id:"u_tt04",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"น้ำเงิน",  sizes:mk({S:1,M:1,L:1,XL:1,"2XL":4}),         loc:"สต๊อกแยก",note:""},
  {id:"u_tt05",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ดำ",       sizes:mk({S:4,M:3,L:5,XL:3,"2XL":2}),         loc:"สต๊อกแยก",note:"สจ/ฟส"},
  {id:"u_tt06",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"มิ้น",     sizes:mk({S:1,L:1,XL:1}),                      loc:"สต๊อกแยก",note:"XL=สจ L=จร"},
  {id:"u_tt07",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"บานเย็น",  sizes:mk({"2XL":2,"3XL":2}),                   loc:"สต๊อกแยก",note:""},
  {id:"u_tt08",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"นู๊ด",     sizes:mk({S:1,"2XL":2,"3XL":1}),               loc:"สต๊อกแยก",note:"S=นฟ"},
  {id:"u_tt09",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ไพร",      sizes:mk({S:3,M:3,L:3,XL:2,"2XL":2,"3XL":3}), loc:"สต๊อกแยก",note:""},
  {id:"u_tt10",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ม่วงเข้ม", sizes:mk({M:2,L:3,XL:2,"2XL":2}),             loc:"สต๊อกแยก",note:""},
  {id:"u_tt11",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"ส้ม",      sizes:mk({S:1,M:5,L:2}),                       loc:"สต๊อกแยก",note:"S/M1/L=จร M4=ปกติ"},
  {id:"u_tt12",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"น้ำตาล",   sizes:mk({S:2,M:2,L:1,XL:4,"2XL":2}),         loc:"สต๊อกแยก",note:"สจ XL3=ฟส"},
  {id:"u_tt13",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"แดงแต่งแดง",sizes:mk({L:1}),                              loc:"สต๊อกแยก",note:""},
  {id:"u_tt14",name:"ตุ้งติ้ง",cat:"👚 เสื้อ",color:"แดงแต่งดำ",sizes:mk({M:3,L:4,XL:2,"2XL":1,"3XL":1}),     loc:"สต๊อกแยก",note:""},
  // คอจีน
  {id:"u_kj01",name:"คอจีน",cat:"👚 เสื้อ",color:"ส้ม",     sizes:mk({S:2}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_kj02",name:"คอจีน",cat:"👚 เสื้อ",color:"เหลืองสด",sizes:mk({S:1}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_kj03",name:"คอจีน",cat:"👚 เสื้อ",color:"ไพร",     sizes:mk({S:1,M:1,L:3,XL:1}),                 loc:"สต๊อกแยก",note:"M/L=จร"},
  {id:"u_kj04",name:"คอจีน",cat:"👚 เสื้อ",color:"เขียว",   sizes:mk({M:2,XL:4,"2XL":1}),                 loc:"สต๊อกแยก",note:""},
  {id:"u_kj05",name:"คอจีน",cat:"👚 เสื้อ",color:"ม่วง",    sizes:mk({M:4,L:5,XL:3}),                     loc:"สต๊อกแยก",note:""},
  {id:"u_kj06",name:"คอจีน",cat:"👚 เสื้อ",color:"น้ำเงิน", sizes:mk({M:1,XL:1,"2XL":1}),                 loc:"สต๊อกแยก",note:""},
  {id:"u_kj07",name:"คอจีน",cat:"👚 เสื้อ",color:"ครีม",    sizes:mk({M:1}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_kj08",name:"คอจีน",cat:"👚 เสื้อ",color:"น้ำตาล",     sizes:mk({M:1,XL:3}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_kj09",name:"คอจีน",cat:"👚 เสื้อ",color:"แดงสด",   sizes:mk({L:3,"3XL":1}),                       loc:"สต๊อกแยก",note:""},
  {id:"u_kj10",name:"คอจีน",cat:"👚 เสื้อ",color:"มิ้น",    sizes:mk({L:1,"2XL":2}),                       loc:"สต๊อกแยก",note:""},
  {id:"u_kj11",name:"คอจีน",cat:"👚 เสื้อ",color:"เลือด",   sizes:mk({XL:3}),                              loc:"สต๊อกแยก",note:""},
  {id:"u_kj12",name:"คอจีน",cat:"👚 เสื้อ",color:"ชมหวาน",  sizes:mk({"2XL":1}),                           loc:"สต๊อกแยก",note:""},
  // คอวี
  {id:"u_kv01",name:"คอวี",cat:"👚 เสื้อ",color:"ส้ม",      sizes:mk({S:1,M:1,L:1,XL:1}),                 loc:"สต๊อกแยก",note:""},
  {id:"u_kv02",name:"คอวี",cat:"👚 เสื้อ",color:"เลือด",    sizes:mk({S:1,L:1,XL:4,"3XL":1}),             loc:"สต๊อกแยก",note:""},
  {id:"u_kv03",name:"คอวี",cat:"👚 เสื้อ",color:"ฟ้า",      sizes:mk({M:4}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_kv04",name:"คอวี",cat:"👚 เสื้อ",color:"ม่วงอ่อน", sizes:mk({M:2,L:4,"2XL":1}),                  loc:"สต๊อกแยก",note:""},
  {id:"u_kv05",name:"คอวี",cat:"👚 เสื้อ",color:"เขียว",    sizes:mk({M:2,"3XL":1}),                       loc:"สต๊อกแยก",note:""},
  {id:"u_kv06",name:"คอวี",cat:"👚 เสื้อ",color:"น้ำตาล",      sizes:mk({M:1}),                               loc:"สต๊อกแยก",note:""},
  {id:"u_kv07",name:"คอวี",cat:"👚 เสื้อ",color:"ม่วงใหม่", sizes:mk({M:2,L:1}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_kv08",name:"คอวี",cat:"👚 เสื้อ",color:"ดำ",       sizes:mk({L:1,XL:1}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_kv09",name:"คอวี",cat:"👚 เสื้อ",color:"ขาว",      sizes:mk({XL:2}),                              loc:"สต๊อกแยก",note:""},
  {id:"u_kv10",name:"คอวี",cat:"👚 เสื้อ",color:"ไพร",      sizes:mk({XL:1}),                              loc:"สต๊อกแยก",note:""},
  {id:"u_kv11",name:"คอวี",cat:"👚 เสื้อ",color:"ชมหวาน",   sizes:mk({"2XL":1}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_kv12",name:"คอวี",cat:"👚 เสื้อ",color:"ม่วง",     sizes:mk({"3XL":3}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_kv13",name:"คอวี",cat:"👚 เสื้อ",color:"ตอง",      sizes:mk({"3XL":1}),                           loc:"สต๊อกแยก",note:""},
  // ปีนใหม่
  {id:"u_pn01",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"เลือด",  sizes:mk({S:2,L:3,XL:5,"2XL":4,"3XL":4}),    loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pn02",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"ม่วง",   sizes:mk({S:2,M:5,L:5,XL:2,"2XL":3,"3XL":3}),loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pn03",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"ดำ",     sizes:mk({S:3,M:5,L:3,XL:2,"3XL":2}),        loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pn04",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"มิ้น",   sizes:mk({S:1,XL:1}),                         loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pn05",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"ชมอ่อน", sizes:mk({L:2,"2XL":4,"3XL":5}),              loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pn06",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"น้ำตาล",    sizes:mk({"3XL":3}),                           loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pn07",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"เทาอ่อน",sizes:mk({L:1,XL:1,"2XL":1}),                 loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pn08",name:"ปีนใหม่",cat:"👚 เสื้อ",color:"ครีม",   sizes:mk({S:2,"3XL":2}),                       loc:"สต๊อกเพิ่มเติม",note:""},
  // เทเลอ/ทูโทน/คอตั้ง
  {id:"u_tl01",name:"เทเลอ",cat:"👚 เสื้อ",color:"ม่วง",    sizes:mk({M:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_tl02",name:"เทเลอ",cat:"👚 เสื้อ",color:"มิ้น",    sizes:mk({XL:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_tl03",name:"เทเลอ",cat:"👚 เสื้อ",color:"ดำแดง",   sizes:mk({L:1,XL:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_tt16",name:"เสื้อทูโทนฟ้าใส",cat:"👚 เสื้อ",color:"ม่วง",sizes:mk({L:1}),loc:"สต๊อกแยก",note:"✨"},
  {id:"u_kt01",name:"คอตั้ง",cat:"👚 เสื้อ",color:"ไพร",    sizes:mk({S:2,M:1,L:2,XL:5,"2XL":2}),loc:"สต๊อกแยก",note:""},
  {id:"u_kt02",name:"คอตั้ง",cat:"👚 เสื้อ",color:"แดง",    sizes:mk({M:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_kt03",name:"คอตั้ง",cat:"👚 เสื้อ",color:"ดำ",     sizes:mk({XL:2}),loc:"สต๊อกแยก",note:""},
  // ปีนตั้งแสง
  {id:"u_pt01",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"กรม",  sizes:mk({"2XL":1}),loc:"สต๊อกแยก",note:""},
  {id:"u_pt02",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"เขียว",sizes:mk({S:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_pt03",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"ฟ้า",  sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_pt04",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"เลือด",sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_pt05",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"ม่วง", sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_pt06",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"ชม",   sizes:mk({L:2}),loc:"สต๊อกแยก",note:""},
  {id:"u_pt07",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"ตอง",  sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_pt08",name:"ปีนตั้งแสง",cat:"👚 เสื้อ",color:"ดำ",   sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  // ยืดเฉียง
  {id:"u_ye01",name:"ยืดเฉียง",cat:"👚 เสื้อ",color:"เหลืองสด",sizes:mk({S:1,L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_ye02",name:"ยืดเฉียง",cat:"👚 เสื้อ",color:"น้ำตาล",    sizes:mk({M:4,XL:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_ye03",name:"ยืดเฉียง",cat:"👚 เสื้อ",color:"บาน",    sizes:mk({M:1,L:1,XL:1,"2XL":1}),loc:"สต๊อกแยก",note:""},
  {id:"u_ye04",name:"ยืดเฉียง",cat:"👚 เสื้อ",color:"แดงสด",  sizes:mk({S:1,L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_ye05",name:"ยืดเฉียง",cat:"👚 เสื้อ",color:"ม่วง",   sizes:mk({M:1,"2XL":1}),loc:"สต๊อกแยก",note:""},
  {id:"u_ye06",name:"ยืดเฉียง",cat:"👚 เสื้อ",color:"ตอง",    sizes:mk({"2XL":1}),loc:"สต๊อกแยก",note:""},
  // ยืดตรง
  {id:"u_yt01",name:"ยืดตรง",cat:"👚 เสื้อ",color:"บาน",      sizes:mk({"2XL":2}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt02",name:"ยืดตรง",cat:"👚 เสื้อ",color:"เลือด",    sizes:mk({S:1,L:2}),loc:"สต๊อกแยก",note:"L=สจ"},
  {id:"u_yt03",name:"ยืดตรง",cat:"👚 เสื้อ",color:"ตอง",      sizes:mk({M:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt04",name:"ยืดตรง",cat:"👚 เสื้อ",color:"ฟ้า",      sizes:mk({L:2}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt05",name:"ยืดตรง",cat:"👚 เสื้อ",color:"เขียว",    sizes:mk({S:2}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt06",name:"ยืดตรง",cat:"👚 เสื้อ",color:"เหลืองสด", sizes:mk({XL:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt07",name:"ยืดตรง",cat:"👚 เสื้อ",color:"ทะเล",     sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt08",name:"ยืดตรง",cat:"👚 เสื้อ",color:"ดำ",       sizes:mk({L:1,"2XL":3}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt09",name:"ยืดตรง",cat:"👚 เสื้อ",color:"แดงสด",    sizes:mk({S:1,L:3}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt10",name:"ยืดตรง",cat:"👚 เสื้อ",color:"น้ำตาล",      sizes:mk({M:2,XL:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_yt11",name:"ยืดตรง",cat:"👚 เสื้อ",color:"น้ำเงิน",  sizes:mk({"2XL":1}),loc:"สต๊อกแยก",note:""},
  // แขนตุ้กตา
  {id:"u_at01",name:"แขนตุ้กตา",cat:"👚 เสื้อ",color:"ดำ",    sizes:mk({L:2}),loc:"สต๊อกแยก",note:""},
  {id:"u_at02",name:"แขนตุ้กตา",cat:"👚 เสื้อ",color:"ม่วง",  sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  {id:"u_at03",name:"แขนตุ้กตา",cat:"👚 เสื้อ",color:"เหลือง",sizes:mk({L:1}),loc:"สต๊อกแยก",note:""},
  // เสื้อแดงแต่งขาว
  {id:"u_ra01",name:"เสื้อแดงแต่งขาว",cat:"👚 เสื้อ",color:"ดำ",       sizes:mk({S:2,M:3,L:3}),   loc:"สต๊อกแยก",note:""},
  {id:"u_ra02",name:"เสื้อแดงแต่งขาว",cat:"👚 เสื้อ",color:"เลือด",    sizes:mk({"2XL":1}),        loc:"สต๊อกแยก",note:""},
  {id:"u_ra03",name:"เสื้อแดงแต่งขาว",cat:"👚 เสื้อ",color:"เขียวเข้ม",sizes:mk({M:1}),            loc:"สต๊อกแยก",note:""},
  {id:"u_ra04",name:"เสื้อแดงแต่งขาว",cat:"👚 เสื้อ",color:"แดงสด",    sizes:mk({M:1,L:2}),        loc:"สต๊อกแยก",note:""},
  {id:"u_ra05",name:"เสื้อแดงแต่งขาว",cat:"👚 เสื้อ",color:"ขาว",      sizes:mk({M:1}),            loc:"สต๊อกแยก",note:""},
  // เสื้อปาเต๊ะ
  {id:"u_pa01",name:"เสื้อปาเต๊ะ",cat:"👚 เสื้อ",color:"ม่วง",  sizes:mk({S:1,"3XL":1}),         loc:"สต๊อกแยก",note:""},
  {id:"u_pa02",name:"เสื้อปาเต๊ะ",cat:"👚 เสื้อ",color:"เขียว", sizes:mk({"3XL":1}),              loc:"สต๊อกแยก",note:""},
  {id:"u_pa03",name:"เสื้อปาเต๊ะ",cat:"👚 เสื้อ",color:"ชม",    sizes:mk({M:1,"2XL":1,"3XL":1}), loc:"สต๊อกแยก",note:""},
  // เสื้อชาย/มยุรี
  {id:"u_sc01",name:"เสื้อชาย",cat:"👚 เสื้อ",color:"เลือด", sizes:mk({XL:1}),    loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_sc02",name:"เสื้อชาย",cat:"👚 เสื้อ",color:"ดำ",    sizes:mk({M:1}),     loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_sc03",name:"เสื้อชาย",cat:"👚 เสื้อ",color:"ขาว",   sizes:mk({L:1}),     loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_sc04",name:"เสื้อชาย",cat:"👚 เสื้อ",color:"ฟ้า",   sizes:mk({M:1}),     loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_sc05",name:"เสื้อชาย",cat:"👚 เสื้อ",color:"กรม",   sizes:mk({M:1}),     loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_sc06",name:"เสื้อชาย",cat:"👚 เสื้อ",color:"น้ำตาล",   sizes:mk({"2XL":1}), loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_my01",name:"มยุรี",   cat:"👚 เสื้อ",color:"ไพร",   sizes:mk({L:1}),     loc:"สต๊อกเพิ่มเติม",note:""},
  // เดรสปาเต๊ะ
  {id:"u_dp01",name:"เดรสปาเต๊ะ",cat:"👗 เดรส",color:"เขียว",sizes:mk({M:1}),    loc:"สต๊อกแยก",note:""},
  {id:"u_dp02",name:"เดรสปาเต๊ะ",cat:"👗 เดรส",color:"ม่วง", sizes:mk({S:1,L:1}), loc:"สต๊อกแยก",note:""},
  // เดรสแต่งไทย
  {id:"u_dt01",name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"น้ำตาล",   sizes:mk({S:1,L:2}),             loc:"สต๊อกแยก",note:"L2✨"},
  {id:"u_dt02",name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"น้ำเงิน",sizes:mk({M:1}),                  loc:"สต๊อกแยก",note:""},
  {id:"u_dt03",name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"โอรส",  sizes:mk({"3XL":1}),               loc:"สต๊อกแยก",note:""},
  {id:"u_dt04",name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"ไพร",   sizes:mk({M:1}),                   loc:"สต๊อกแยก",note:""},
  {id:"u_dt05",name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"ม่วง",  sizes:mk({S:2,M:2,"2XL":1}),       loc:"สต๊อกแยก",note:""},
  {id:"u_dt06",name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"เขียว", sizes:mk({M:2,L:2,XL:2,"2XL":2}),  loc:"สต๊อกแยก",note:""},
  {id:"u_dt07",name:"เดรสแต่งไทย",cat:"👗 เดรส",color:"ดำ",    sizes:mk({L:2}),                   loc:"สต๊อกแยก",note:""},
  // เดรสทูโทนฟ้าใส
  {id:"u_dtt01",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"ครีม",   sizes:mk({S:1,M:1}),                       loc:"สต๊อกแยก",note:""},
  {id:"u_dtt02",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"ไพร",    sizes:mk({S:1}),                            loc:"สต๊อกแยก",note:""},
  {id:"u_dtt03",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"ฟ้า",    sizes:mk({S:1,M:1,"3XL":1}),               loc:"สต๊อกแยก",note:""},
  {id:"u_dtt04",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"น้ำตาล",    sizes:mk({S:1,XL:1}),                      loc:"สต๊อกแยก",note:""},
  {id:"u_dtt05",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"แดง",    sizes:mk({S:1,"3XL":1}),                   loc:"สต๊อกแยก",note:""},
  {id:"u_dtt06",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"ชม",     sizes:mk({S:1,"3XL":1}),                   loc:"สต๊อกแยก",note:""},
  {id:"u_dtt07",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"น้ำเงิน",sizes:mk({M:1}),                            loc:"สต๊อกแยก",note:""},
  {id:"u_dtt08",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"เขียว",  sizes:mk({M:2,L:3,XL:2}),                 loc:"สต๊อกแยก",note:""},
  {id:"u_dtt09",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"เลือด",  sizes:mk({M:2,L:2,XL:2,"2XL":1,"3XL":1}), loc:"สต๊อกแยก",note:""},
  {id:"u_dtt10",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"ดำ",     sizes:mk({"3XL":2}),                        loc:"สต๊อกแยก",note:""},
  {id:"u_dtt11",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"แดงสด",  sizes:mk({"2XL":1}),                        loc:"สต๊อกแยก",note:""},
  {id:"u_dtt12",name:"เดรสทูโทนฟ้าใส",cat:"👗 เดรส",color:"ชมพู",   sizes:mk({"3XL":1}),                        loc:"สต๊อกแยก",note:""},
  // เดรสสีพื้น
  {id:"u_dsp01",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"ดำ",          sizes:mk({S:1,M:3,L:1}),     loc:"สต๊อกแยก",note:"S/M=จร"},
  {id:"u_dsp02",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"ม่วงอ่อนเล็ก",sizes:mk({S:1}),              loc:"สต๊อกแยก",note:""},
  {id:"u_dsp03",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"ม่วง",        sizes:mk({S:1,L:1}),          loc:"สต๊อกแยก",note:""},
  {id:"u_dsp04",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"เลือด",       sizes:mk({S:1,M:1,L:2}),      loc:"สต๊อกแยก",note:""},
  {id:"u_dsp05",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"ชมอ่อน",      sizes:mk({S:4,M:5,L:2}),      loc:"สต๊อกแยก",note:""},
  {id:"u_dsp06",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"ชม",          sizes:mk({L:2,XL:2}),         loc:"สต๊อกแยก",note:"XL1=ฟส"},
  {id:"u_dsp07",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"กรม",         sizes:mk({L:1}),              loc:"สต๊อกแยก",note:""},
  {id:"u_dsp08",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"แดงสด",       sizes:mk({L:1}),              loc:"สต๊อกแยก",note:"เล็ก"},
  {id:"u_dsp09",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"น้ำตาล",         sizes:mk({XL:1}),             loc:"สต๊อกแยก",note:""},
  {id:"u_dsp10",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"ไพร",         sizes:mk({XL:1}),             loc:"สต๊อกแยก",note:""},
  {id:"u_dsp11",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"ชมหวาน",      sizes:mk({"2XL":1}),           loc:"สต๊อกแยก",note:""},
  {id:"u_dsp12",name:"เดรสสีพื้น",cat:"👗 เดรส",color:"แดงดำใหญ่",   sizes:mk({"2XL":2}),           loc:"สต๊อกแยก",note:"นฟ"},
  // เดรสตุ้งติ้งใหม่
  {id:"u_dtn01",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"แดงสด", sizes:mk({S:1}),               loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn02",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"น้ำเงิน",sizes:mk({S:3,L:1}),          loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn03",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"เขียว",  sizes:mk({M:1,L:2}),          loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn04",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"ม่วง",   sizes:mk({M:2,L:2,XL:3}),     loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn05",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"แดง",    sizes:mk({M:1}),               loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn06",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"ดำ",     sizes:mk({M:1,L:1}),           loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn07",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"แดงดำ",  sizes:mk({L:1}),               loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn08",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"น้ำตาล",    sizes:mk({L:1}),               loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn09",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"บาน",    sizes:mk({L:2,XL:3,"3XL":3}),  loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn10",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"ชมอ่อน", sizes:mk({XL:1}),              loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dtn11",name:"เดรสตุ้งติ้งใหม่",cat:"👗 เดรส",color:"ส้ม",    sizes:mk({"2XL":1}),            loc:"สต๊อกเพิ่มเติม",note:""},
  // เดรสนางฟ้า
  {id:"u_dnf01",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"ชมเข้ม",   sizes:mk({L:1}),                        loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dnf02",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"ชมอ่อน",   sizes:mk({S:5,M:7,L:2,XL:3,"2XL":2}),  loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dnf03",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"เขียวเข้ม", sizes:mk({M:1}),                        loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dnf04",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"ม่วง",     sizes:mk({M:1}),                        loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dnf05",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"เลือด",    sizes:mk({S:8,M:6,L:2,XL:2,"2XL":2}),  loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dnf06",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"น้ำเงิน",  sizes:mk({M:2,"2XL":1}),                loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dnf07",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"น้ำตาล",   sizes:mk({M:1,L:2,XL:1}),              loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dnf08",name:"เดรสนางฟ้า",cat:"👗 เดรส",color:"แดงสว่าง", sizes:mk({S:1,M:2,L:2,XL:4,"2XL":1}),  loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_dgb01",name:"เดรสกระดุม",cat:"👗 เดรส",color:"ชม",sizes:mk({S:1}),     loc:"สต๊อกเพิ่มเติม",note:"นฟ"},
  {id:"u_dgb02",name:"เดรสกระดุม",cat:"👗 เดรส",color:"ส้ม",sizes:mk({"3XL":1}),loc:"สต๊อกเพิ่มเติม",note:""},
  // เกงพื้น
  {id:"u_gp01",name:"เกงพื้น",cat:"👖 กางเกง",color:"กากี",    sizes:mk({M:1}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_gp02",name:"เกงพื้น",cat:"👖 กางเกง",color:"มิ้น",    sizes:mk({M:2,L:1,"3XL":1}),               loc:"สต๊อกแยก",note:"L=นฟ"},
  {id:"u_gp03",name:"เกงพื้น",cat:"👖 กางเกง",color:"กรม",     sizes:mk({M:4,L:4,XL:2,"3XL":2}),         loc:"สต๊อกแยก",note:"L1/3XL1=ฟส"},
  {id:"u_gp04",name:"เกงพื้น",cat:"👖 กางเกง",color:"เทาเข้ม", sizes:mk({M:1,L:1}),                       loc:"สต๊อกแยก",note:"M=นฟ"},
  {id:"u_gp05",name:"เกงพื้น",cat:"👖 กางเกง",color:"ครีม",    sizes:mk({M:1,L:1,XL:3,"2XL":2,"3XL":3}), loc:"สต๊อกแยก",note:""},
  {id:"u_gp06",name:"เกงพื้น",cat:"👖 กางเกง",color:"เขียวเข้ม",sizes:mk({L:1}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_gp07",name:"เกงพื้น",cat:"👖 กางเกง",color:"เขียว",   sizes:mk({XL:1}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_gp08",name:"เกงพื้น",cat:"👖 กางเกง",color:"ม่วง",    sizes:mk({XL:3}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_gp09",name:"เกงพื้น",cat:"👖 กางเกง",color:"น้ำตาล",     sizes:mk({S:2}),                           loc:"สต๊อกแยก",note:"จริง"},
  {id:"u_gp10",name:"เกงพื้น",cat:"👖 กางเกง",color:"เทาอ่อน", sizes:mk({S:1}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_gp11",name:"เกงพื้น",cat:"👖 กางเกง",color:"ไพร",     sizes:mk({S:2}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_gp12",name:"เกงพื้น",cat:"👖 กางเกง",color:"เลือด",   sizes:mk({M:1,L:1,XL:1,"2XL":1}),         loc:"สต๊อกแยก",note:""},
  // เกง ตต
  {id:"u_gtt01",name:"เกง ตต",cat:"👖 กางเกง",color:"น้ำเงิน", sizes:mk({XL:2}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_gtt02",name:"เกง ตต",cat:"👖 กางเกง",color:"ไพร",     sizes:mk({M:1}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_gtt03",name:"เกง ตต",cat:"👖 กางเกง",color:"เขียว",   sizes:mk({XL:1}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_gtt04",name:"เกง ตต",cat:"👖 กางเกง",color:"แดงสด",   sizes:mk({XL:1}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_gtt05",name:"เกง ตต",cat:"👖 กางเกง",color:"ม่วง",    sizes:mk({M:1,L:1,XL:4,"2XL":2}),         loc:"สต๊อกแยก",note:""},
  {id:"u_gtt06",name:"เกง ตต",cat:"👖 กางเกง",color:"ครีม",    sizes:mk({L:2}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_gtt07",name:"เกง ตต",cat:"👖 กางเกง",color:"มิ้น",    sizes:mk({M:1}),                           loc:"สต๊อกแยก",note:"นฟ"},
  {id:"u_gtt08",name:"เกง ตต",cat:"👖 กางเกง",color:"ส้ม",     sizes:mk({S:1,L:1}),                       loc:"สต๊อกแยก",note:"จร(300)"},
  {id:"u_gtt09",name:"เกง ตต",cat:"👖 กางเกง",color:"ปาเต๊ะดำ",sizes:mk({M:1}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_gtt10",name:"เกง ตต",cat:"👖 กางเกง",color:"เหลือง",  sizes:mk({M:2}),                           loc:"สต๊อกแยก",note:""},
  {id:"u_gtt11",name:"เกง ตต",cat:"👖 กางเกง",color:"เลือด",   sizes:mk({S:1,L:1}),                       loc:"สต๊อกแยก",note:""},
  // เกงแต่งไทย
  {id:"u_ga01",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"ชมหวาน",sizes:mk({XL:1}),                        loc:"สต๊อกแยก",note:""},
  {id:"u_ga02",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"แดงสด", sizes:mk({XL:1}),                        loc:"สต๊อกแยก",note:""},
  {id:"u_ga03",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"ม่วง",  sizes:mk({"2XL":3}),                      loc:"สต๊อกแยก",note:""},
  {id:"u_ga04",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"นู๊ด",  sizes:mk({"2XL":2,"3XL":1}),             loc:"สต๊อกแยก",note:""},
  {id:"u_ga05",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"เลือด", sizes:mk({M:1}),                          loc:"สต๊อกแยก",note:"สจ"},
  {id:"u_ga06",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"เขียว", sizes:mk({S:1}),                          loc:"สต๊อกแยก",note:""},
  {id:"u_ga07",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"โอรส",  sizes:mk({XL:2}),                        loc:"สต๊อกแยก",note:""},
  {id:"u_ga08",name:"เกงแต่งไทย",cat:"👖 กางเกง",color:"ดำ",    sizes:mk({XL:2,"2XL":1,"3XL":2}),        loc:"สต๊อกแยก",note:""},
  // พิมพ์ทอง
  {id:"u_pm01",name:"พิมพ์ทอง",cat:"👖 กางเกง",color:"ทั่วไป",sizes:mk({L:3,S:2}),loc:"สต๊อกเพิ่มเติม",note:"ใหญ่3 เล็ก2"},
  {id:"u_pm02",name:"พิมพ์ทอง",cat:"👖 กางเกง",color:"ม่วง",  sizes:mk({M:2}),    loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pm03",name:"พิมพ์ทอง",cat:"👖 กางเกง",color:"ฟ้า",   sizes:mk({M:2}),    loc:"สต๊อกเพิ่มเติม",note:""},
  {id:"u_pm04",name:"พิมพ์ทอง",cat:"👖 กางเกง",color:"ชม",    sizes:mk({M:1}),    loc:"สต๊อกเพิ่มเติม",note:""},
  // กระโปรง/รองเท้า
  {id:"u_sk01",name:"กระโปรง",cat:"👖 กางเกง",color:"ทั่วไป",sizes:mk({L:1,S:1}),loc:"สต๊อกเพิ่มเติม",note:"ใหญ่1 เล็ก"},
  {id:"u_sh01",name:"รองเท้า",cat:"👟 รองเท้า",color:"ทั่วไป",sizes:mk({}),loc:"สต๊อกเพิ่มเติม",note:""},
];

// ═══════════════════════════════════════════════════════
// LOGOS
// ═══════════════════════════════════════════════════════
function IwaSpaLogo({ size=56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="s1bg"><stop offset="0%" stopColor="#FFF"/><stop offset="100%" stopColor="#F0F8F0"/></radialGradient>
        <linearGradient id="s1ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EDD97A"/><stop offset="45%" stopColor="#C8A830"/><stop offset="100%" stopColor="#EDD97A"/>
        </linearGradient>
        <linearGradient id="s1leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7DD44A"/><stop offset="100%" stopColor="#3A8C1A"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="57" fill="url(#s1bg)"/>
      <circle cx="60" cy="60" r="53" fill="none" stroke="url(#s1ring)" strokeWidth="10"/>
      <path d="M60 14 C52 20 46 30 49 39 C53 44 58 41 60 36 C62 41 67 44 71 39 C74 30 68 20 60 14Z" fill="url(#s1leaf)"/>
      <line x1="60" y1="14" x2="60" y2="37" stroke="#2A6A10" strokeWidth="1.2" strokeOpacity="0.5"/>
      <text x="60" y="70" fontSize="27" fontWeight="900" fontFamily="Georgia,serif" fill="#1A3D1A" textAnchor="middle" letterSpacing="3">IWA</text>
      <text x="60" y="85" fontSize="9.5" fontWeight="700" fontFamily="Georgia,serif" fill="#1A3D1A" textAnchor="middle" letterSpacing="3">SPA SHOP</text>
    </svg>
  );
}

function IwaUniformLogo({ size=56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="u1bg"><stop offset="0%" stopColor="#FFF"/><stop offset="100%" stopColor="#FDF5E8"/></radialGradient>
        <linearGradient id="u1ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0D870"/><stop offset="40%" stopColor="#C9912A"/><stop offset="100%" stopColor="#F0D870"/>
        </linearGradient>
        <linearGradient id="u1wa" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F0D870"/><stop offset="50%" stopColor="#C9912A"/><stop offset="100%" stopColor="#8B5E0A"/>
        </linearGradient>
        <linearGradient id="u1face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9912A"/><stop offset="100%" stopColor="#8B5E0A"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="57" fill="url(#u1bg)"/>
      <circle cx="60" cy="60" r="53" fill="none" stroke="url(#u1ring)" strokeWidth="9"/>
      <path d="M33 90 C31 81 29 68 30 55 C31 40 38 30 48 27 C53 25 57 28 58 34 C60 43 57 51 55 58 C53 65 54 72 57 77 C53 81 43 87 33 90Z" fill="url(#u1face)" opacity="0.88"/>
      <path d="M50 28 C53 20 61 14 70 11" stroke="#8B5E0A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M57 21 C62 15 70 13 77 16" stroke="#8B5E0A" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <ellipse cx="72" cy="10" rx="5.5" ry="8.5" fill="#3A8A50" transform="rotate(-22 72 10)"/>
      <ellipse cx="78" cy="14" rx="4.5" ry="7" fill="#4AAB60" transform="rotate(18 78 14)"/>
      <ellipse cx="64" cy="8" rx="4" ry="6.5" fill="#2D6E44" transform="rotate(-38 64 8)"/>
      <ellipse cx="80" cy="23" rx="3.5" ry="5.5" fill="#3A8A50" transform="rotate(32 80 23)"/>
      <text x="73" y="72" fontSize="35" fontWeight="900" fontFamily="Georgia,serif" fill="url(#u1wa)" textAnchor="middle" letterSpacing="-1">WA</text>
      <text x="60" y="86" fontSize="6.5" fontWeight="700" fontFamily="Georgia,serif" fill="#2D6E44" textAnchor="middle" letterSpacing="0.5">IwaUniformSpa</text>
      <line x1="32" y1="90" x2="88" y2="90" stroke="#C9912A" strokeWidth="0.7" opacity="0.4"/>
    </svg>
  );
}
function IwaLogo({ size=48, store="iwa" }) {
  return store==="iwa" ? <IwaSpaLogo size={size}/> : <IwaUniformLogo size={size}/>;
}

// ═══════════════════════════════════════════════════════
// STORE SWITCHER
// ═══════════════════════════════════════════════════════
function StoreSwitcher({ active, onChange, iwaTot, unifTot }) {
  const stores = [
    { key:"iwa",     label:"🌿 iwa spa shop",    sub:`${iwaTot} ชิ้น`,  bg:"#0D2B18", active_bg:"#1A4D2E", gold:"#C9912A" },
    { key:"uniform", label:"👔 ไอวาร์ยูนิฟอร์ม", sub:`${unifTot} ชิ้น`, bg:"#06152E", active_bg:"#0D2B5E", gold:"#F5D98A" },
  ];
  return (
    <div style={{display:"flex",background:"#0A0800"}}>
      {stores.map(s=>{
        const on=active===s.key;
        return (
          <button key={s.key} onClick={()=>onChange(s.key)} style={{
            flex:1,padding:"18px 10px",border:"none",cursor:"pointer",
            background:on?`linear-gradient(135deg,${s.active_bg},${s.active_bg}dd)`:"rgba(255,255,255,0.03)",
            borderBottom:`4px solid ${on?s.gold:"transparent"}`,
            transition:"all .25s",display:"flex",flexDirection:"column",alignItems:"center",gap:2,
          }}>
            <span style={{fontSize:16,fontWeight:900,color:on?"#fff":"rgba(255,255,255,0.35)",fontFamily:"'Sarabun',sans-serif"}}>{s.label}</span>
            <span style={{fontSize:12,color:on?s.gold:"rgba(255,255,255,0.2)",fontWeight:700}}>{s.sub}</span>
            {on&&<div style={{width:24,height:3,background:s.gold,borderRadius:99,marginTop:2}}/>}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PRODUCT FORM MODAL
// ═══════════════════════════════════════════════════════
function ProductModal({ T, store, item, onClose, onSave }) {
  const isEdit=!!item;
  const LOCS=getLocs(store);
  const [form,setForm]=useState(item?{...item}:{name:"",cat:CATS[0],color:"",sizes:mk(),loc:LOCS[0],note:""});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const setSz=(s,v)=>setForm(p=>({...p,sizes:{...p.sizes,[s]:Math.max(0,parseInt(v)||0)}}));
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:T.bg,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",border:`1px solid ${T.border}`,borderBottom:"none"}}>
        <div style={{background:`linear-gradient(135deg,${T.g1},${T.g2})`,padding:"13px 16px",flexShrink:0}}>
          <div style={{width:32,height:4,background:T.gold2,borderRadius:99,margin:"0 auto 9px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:800,fontSize:14,color:T.gold3}}>{isEdit?"✏️ แก้ไขสินค้า":"➕ เพิ่มสินค้าใหม่"}</div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:28,height:28,color:"#fff",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"12px 14px 40px",flex:1}}>
          {[{label:"ชื่อสินค้า",key:"name",ph:"เช่น คอปีน..."},{label:"สี",key:"color",ph:"เช่น ขาว, ดำ..."},{label:"หมายเหตุ",key:"note",ph:"..."}].map(({label,key,ph})=>(
            <div key={key} style={{marginBottom:11}}>
              <label style={{fontSize:9,fontWeight:700,color:T.text3,letterSpacing:1.5,display:"block",marginBottom:4}}>{label}</label>
              <input type="text" value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph}
                style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text1,background:T.card,fontFamily:"'Sarabun',sans-serif",outline:"none"}}/>
            </div>
          ))}
          <div style={{marginBottom:11}}>
            <label style={{fontSize:9,fontWeight:700,color:T.text3,letterSpacing:1.5,display:"block",marginBottom:4}}>หมวดสินค้า</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {CATS.map(c=><button key={c} onClick={()=>set("cat",c)} style={{padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",border:`2px solid ${form.cat===c?T.accent:T.border}`,background:form.cat===c?T.accent:T.card,color:form.cat===c?"#fff":T.text2}}>{c}</button>)}
            </div>
          </div>
          <div style={{marginBottom:11}}>
            <label style={{fontSize:9,fontWeight:700,color:T.text3,letterSpacing:1.5,display:"block",marginBottom:4}}>ตำแหน่ง</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {LOCS.map(l=><button key={l} onClick={()=>set("loc",l)} style={{padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",border:`2px solid ${form.loc===l?T.gold1:T.border}`,background:form.loc===l?T.gold1:T.card,color:form.loc===l?"#fff":T.text2}}>{l}</button>)}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:9,fontWeight:700,color:T.text3,letterSpacing:1.5,display:"block",marginBottom:4}}>จำนวนแต่ละไซส์</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {SIZES.map(s=>(
                <div key={s} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"6px",textAlign:"center"}}>
                  <div style={{fontSize:9,fontWeight:800,color:sChip[s]?.tc||T.text3,marginBottom:3}}>{s}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                    <button onClick={()=>setSz(s,(form.sizes[s]||0)-1)} style={{width:20,height:20,borderRadius:5,border:`1px solid ${T.border}`,background:"#F3F4F6",fontSize:13,cursor:"pointer",lineHeight:1}}>−</button>
                    <span style={{fontSize:14,fontWeight:800,color:T.text1,minWidth:20,textAlign:"center"}}>{form.sizes[s]||0}</span>
                    <button onClick={()=>setSz(s,(form.sizes[s]||0)+1)} style={{width:20,height:20,borderRadius:5,border:`1px solid ${T.border}`,background:"#F3F4F6",fontSize:13,cursor:"pointer",lineHeight:1}}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={()=>{if(form.name&&form.color){onSave({...form,id:form.id||genId()});onClose();}}}
            style={{width:"100%",padding:"12px 0",borderRadius:12,fontWeight:900,fontSize:13,background:form.name&&form.color?`linear-gradient(135deg,${T.g1},${T.g2})`:"#E5E7EB",color:form.name&&form.color?T.gold3:"#9CA3AF",border:"none",cursor:form.name&&form.color?"pointer":"default"}}>
            {isEdit?"💾 บันทึก":"✅ เพิ่มสินค้า"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STOCK MODAL
// ═══════════════════════════════════════════════════════
function StockModal({ T, item, onClose, onUpdate, onLog }) {
  const [local,setLocal]=useState({...item.sizes});
  const [mode,setMode]=useState("sell");
  const [qty,setQty]=useState(1);
  const [sz,setSz]=useState(null);
  const [flash,setFlash]=useState(null);
  const total=Object.values(local).reduce((a,b)=>a+(b||0),0);

  function apply(){
    if(!sz)return;
    const before=local[sz]||0;
    const after=mode==="sell"?Math.max(0,before-qty):before+qty;
    const updated={...local,[sz]:after};
    setLocal(updated);setFlash(sz);setTimeout(()=>setFlash(null),600);
    onLog({time:nowStr(),date:todayStr(),type:mode,name:item.name,color:item.color,cat:item.cat,size:sz,qty:mode==="sell"?-qty:qty,before,after});
    onUpdate({...item,sizes:updated});setQty(1);
  }

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:T.bg,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"0 0 48px",border:`1px solid ${T.border}`,borderBottom:"none",boxShadow:`0 -8px 32px ${T.gold1}44`}}>
        <style>{`@keyframes pops{0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}`}</style>

        {/* Handle bar */}
        <div style={{width:40,height:5,background:`linear-gradient(90deg,${T.gold1},${T.gold2},${T.gold1})`,borderRadius:99,margin:"14px auto 0"}}/>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${T.g1},${T.g2})`,margin:"12px 14px 0",borderRadius:14,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:900,fontSize:17,color:"#fff"}}>
              {item.name}
              <span style={{background:"rgba(255,255,255,0.2)",borderRadius:99,padding:"2px 10px",fontSize:13,fontWeight:700,marginLeft:8}}>สี{item.color}</span>
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.65)",marginTop:3}}>
              รวมทั้งหมด <b style={{color:T.gold3,fontSize:15}}>{total}</b> ชิ้น
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:34,height:34,color:"#fff",cursor:"pointer",fontSize:16}}>✕</button>
        </div>

        <div style={{padding:"14px 14px 0"}}>

          {/* Stock chips */}
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
            {SIZES.map(s=>(local[s]!==undefined)&&(
              <div key={s} style={{
                background:(local[s]||0)>0?sChip[s]?.bg:"#F3F4F6",
                color:(local[s]||0)>0?sChip[s]?.tc:"#9CA3AF",
                borderRadius:10,padding:"8px 14px",
                fontWeight:900,fontSize:15,
                opacity:(local[s]||0)===0?0.35:1,
                border:`2px solid ${flash===s?T.gold2:"transparent"}`,
                animation:flash===s?"pops .4s ease":"none",
              }}>{s} : {local[s]||0}</div>
            ))}
          </div>

          {/* Mode toggle */}
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[{id:"sell",l:"🛍️ ขายออก / ดึงสต๊อก",c:"#DC2626"},{id:"buy",l:"📦 รับสินค้าเข้า",c:"#16A34A"}].map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)} style={{
                flex:1,padding:"12px 0",borderRadius:12,
                fontWeight:800,fontSize:13,
                border:`2.5px solid ${mode===m.id?m.c:T.border}`,
                background:mode===m.id?m.c:T.card,
                color:mode===m.id?"#fff":T.text2,
                cursor:"pointer",transition:"all .15s",
              }}>{m.l}</button>
            ))}
          </div>

          {/* Size picker */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:1,marginBottom:8}}>เลือกไซส์</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {SIZES.map(s=>{
                const active=sz===s;
                const empty=(local[s]||0)===0;
                return (
                  <button key={s} onClick={()=>setSz(s)} style={{
                    padding:"10px 16px",borderRadius:10,
                    fontWeight:800,fontSize:14,
                    border:`2.5px solid ${active?T.gold1:empty?"#CCCCCC":"#555555"}`,
                    background:active?`linear-gradient(135deg,${T.gold1},${T.gold2})`:empty?"#F0F0F0":"#FFFFFF",
                    color:active?"#1A0F00":empty?"#AAAAAA":"#1A1A1A",
                    cursor:"pointer",
                    opacity:mode==="sell"&&empty?0.4:1,
                    boxShadow:active?`0 3px 10px ${T.gold1}55`:"0 1px 4px rgba(0,0,0,0.15)",
                  }}>
                    {s}
                    <span style={{fontSize:11,fontWeight:700,marginLeft:4,color:active?"#1A0F00":empty?"#AAAAAA":"#333333"}}>({local[s]||0})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qty stepper */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,letterSpacing:1,marginBottom:8}}>จำนวน</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <button onClick={()=>setQty(Math.max(1,qty-1))} style={{
                width:48,height:48,borderRadius:12,
                border:"2.5px solid #555555",
                background:"#FFFFFF",
                fontSize:26,cursor:"pointer",
                color:"#1A1A1A",fontWeight:900,
                boxShadow:"0 2px 6px rgba(0,0,0,0.15)",
              }}>−</button>
              <span style={{
                fontSize:32,fontWeight:900,
                color:"#1A1A1A",
                minWidth:56,textAlign:"center",
                background:"#F8F8F8",
                border:"2px solid #CCCCCC",
                borderRadius:10,padding:"4px 10px",
              }}>{qty}</span>
              <button onClick={()=>setQty(qty+1)} style={{
                width:48,height:48,borderRadius:12,
                border:"2.5px solid #555555",
                background:"#FFFFFF",
                fontSize:26,cursor:"pointer",
                color:"#1A1A1A",fontWeight:900,
                boxShadow:"0 2px 6px rgba(0,0,0,0.15)",
              }}>+</button>
            </div>
          </div>

          {/* Confirm button */}
          <button onClick={apply} disabled={!sz} style={{
            width:"100%",padding:"15px 0",borderRadius:14,
            fontWeight:900,fontSize:15,
            background:!sz?"#E5E7EB":mode==="sell"
              ?"linear-gradient(135deg,#DC2626,#B91C1C)"
              :"linear-gradient(135deg,#16A34A,#15803D)",
            color:!sz?"#9CA3AF":"#fff",
            border:"none",cursor:!sz?"default":"pointer",
            boxShadow:!sz?"none":mode==="sell"?"0 4px 14px #DC262655":"0 4px 14px #16A34A55",
          }}>
            {mode==="sell"?"🛍️ ดึงออก":"📦 รับเข้า"} {qty} ชิ้น{sz?` · ไซส์ ${sz}`:""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DAILY DASHBOARD
// ═══════════════════════════════════════════════════════
function LogRow({ log }) {
  const sell=log.type==="sell";
  return (
    <div style={{background:sell?"#FFF1F2":"#F0FDF4",border:`1.5px solid ${sell?"#FECDD3":"#BBF7D0"}`,borderRadius:10,padding:"8px 10px",marginBottom:5}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}>
            <span style={{fontSize:9,background:sell?"#DC2626":"#16A34A",color:"#fff",borderRadius:4,padding:"1px 6px",fontWeight:800}}>{sell?"ขาย":"รับ"}</span>
            <span style={{fontWeight:800,fontSize:12,color:"#0F172A"}}>{log.name}</span>
            <span style={{fontSize:11,color:"#64748B"}}>สี{log.color}</span>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{background:sChip[log.size]?.bg||"#F1F5F9",color:sChip[log.size]?.tc||"#374151",fontSize:10,fontWeight:800,borderRadius:4,padding:"1px 6px"}}>ไซส์ {log.size}</span>
            <span style={{fontSize:11,fontWeight:800,color:sell?"#DC2626":"#16A34A"}}>{log.qty>0?"+":""}{log.qty} ชิ้น</span>
            <span style={{fontSize:10,color:"#94A3B8"}}>({log.before}→{log.after})</span>
          </div>
          {/* แสดงชื่อผู้ดึง/รับ */}
          {log.who&&log.who!=="-"&&(
            <div style={{marginTop:4,display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10,color:sell?"#DC2626":"#16A34A",fontWeight:700}}>
                👤 {sell?"ดึงโดย":"รับโดย"}: <b>{log.who}</b>
              </span>
            </div>
          )}
        </div>
        <span style={{fontSize:9,color:"#94A3B8",fontWeight:600,flexShrink:0,marginLeft:6}}>{log.time}</span>
      </div>
    </div>
  );
}

function DailyDash({ T, logs, stock, onClose }) {
  const today=todayStr();
  const tl=logs.filter(l=>l.date===today);
  const out=tl.filter(l=>l.type==="sell");
  const inL=tl.filter(l=>l.type==="buy");
  const totalOut=out.reduce((s,l)=>s+Math.abs(l.qty),0);
  const totalIn=inL.reduce((s,l)=>s+l.qty,0);
  const low=stock.filter(p=>{const t=totalSz(p.sizes);return t>0&&t<=3;});
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:T.bg,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",display:"flex",flexDirection:"column",border:`1px solid ${T.border}`,borderBottom:"none"}}>
        <div style={{background:`linear-gradient(135deg,${T.gold1},${T.gold2})`,borderRadius:"22px 22px 0 0",padding:"15px 16px 12px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:900,fontSize:15,color:T.g1}}>📊 Dashboard รายวัน</div>
              <div style={{fontSize:9,color:T.g2,marginTop:1}}>{todayFull()}</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(0,0,0,0.15)",border:"none",borderRadius:"50%",width:28,height:28,color:T.g1,cursor:"pointer",fontWeight:800,fontSize:13}}>✕</button>
          </div>
          <div style={{display:"flex",gap:6,marginTop:10}}>
            {[{l:"ขายออก",v:totalOut,i:"🛍️",c:"#DC2626"},{l:"รับเข้า",v:totalIn,i:"📦",c:"#16A34A"},{l:"รายการ",v:tl.length,i:"📋",c:T.g1},{l:"ใกล้หมด",v:low.length,i:"⚠️",c:"#D97706"}].map(s=>(
              <div key={s.l} style={{flex:1,background:"rgba(255,255,255,0.45)",borderRadius:10,padding:"7px 4px",textAlign:"center"}}>
                <div style={{fontSize:16}}>{s.i}</div>
                <div style={{fontWeight:900,fontSize:17,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:8,color:T.g1,marginTop:1,fontWeight:700}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"11px 13px 40px",flex:1}}>
          {low.length>0&&(
            <div style={{background:"#FFFBEB",border:"1.5px solid #FCD34D",borderRadius:11,padding:"9px 11px",marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:11,color:"#D97706",marginBottom:5}}>⚠️ สินค้าใกล้หมด ({low.length} รายการ)</div>
              {low.map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:"1px solid #FDE68A"}}>
                  <span style={{fontSize:11,color:"#92400E",fontWeight:600}}>{p.name} · สี{p.color}</span>
                  <span style={{fontSize:10,fontWeight:800,color:"#DC2626"}}>เหลือ {totalSz(p.sizes)} ชิ้น</span>
                </div>
              ))}
            </div>
          )}
          {tl.length===0?(
            <div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:28,marginBottom:6}}>📭</div><div style={{color:T.text3,fontSize:12,fontWeight:600}}>ยังไม่มีการเคลื่อนไหววันนี้</div></div>
          ):(
            <>
              {out.length>0&&<><div style={{fontWeight:800,fontSize:10,color:"#DC2626",marginBottom:5,display:"flex",alignItems:"center",gap:5}}><span style={{width:3,height:13,background:"#DC2626",borderRadius:99,display:"inline-block"}}/>ขายออก ({out.length} รายการ · {totalOut} ชิ้น)</div>{[...out].reverse().map((l,i)=><LogRow key={i} log={l}/>)}</>}
              {inL.length>0&&<><div style={{fontWeight:800,fontSize:10,color:"#16A34A",margin:"10px 0 5px",display:"flex",alignItems:"center",gap:5}}><span style={{width:3,height:13,background:"#16A34A",borderRadius:99,display:"inline-block"}}/>รับเข้า ({inL.length} รายการ · {totalIn} ชิ้น)</div>{[...inL].reverse().map((l,i)=><LogRow key={i} log={l}/>)}</>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PRODUCT CARD — ชื่อ+สีบรรทัดเดียว, ฟอนต์ใหญ่, สีชัด
// ═══════════════════════════════════════════════════════
function ProductCard({ T, item, onStock, onEdit, onDelete }) {
  const total=totalSz(item.sizes);
  const isLow=total>0&&total<=3;
  const isEmpty=total===0;
  const cc=T.catColors[item.cat.split(" ")[0]]||{a:T.g1,b:T.g2};

  return (
    <div style={{
      background:T.card,
      borderRadius:16,
      border:`2px solid ${isLow?"#F59E0B":isEmpty?"#FCA5A5":T.border}`,
      overflow:"hidden",
      boxShadow:`0 3px 12px rgba(0,0,0,0.08)`,
      opacity:isEmpty?0.65:1,
    }}>
      {/* Header — ชื่อสินค้า + สี + จำนวน */}
      <div style={{
        background:`linear-gradient(135deg,${cc.a},${cc.b})`,
        padding:"12px 14px",
      }}>
        {/* บรรทัดเดียว: ชื่อ · สีอะไร */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{
              fontWeight:900, fontSize:18, color:"#fff",
              display:"flex", alignItems:"center", gap:6, flexWrap:"wrap",
            }}>
              <span style={{whiteSpace:"nowrap"}}>{item.name}</span>
              <span style={{
                background:"rgba(255,255,255,0.22)",
                borderRadius:99, padding:"3px 12px",
                fontSize:15, fontWeight:700, color:"#fff",
                whiteSpace:"nowrap",
              }}>สี{item.color}</span>
              {item.loc&&(
                <span style={{fontSize:12,color:"rgba(255,255,255,0.65)",fontWeight:600}}>📍{item.loc}</span>
              )}
            </div>
          </div>
          {/* จำนวนรวม */}
          <div style={{
            background: isEmpty?"rgba(255,255,255,0.15)":isLow?"#F59E0B":"rgba(255,255,255,0.2)",
            borderRadius:10, padding:"6px 12px", flexShrink:0, textAlign:"center",
            border: isLow?"2px solid #FDE68A":"2px solid transparent",
          }}>
            <div style={{fontSize:20,fontWeight:900,color:isLow?"#1A1200":"#fff",lineHeight:1}}>
              {isEmpty?"หมด":total}
            </div>
            <div style={{fontSize:9,color:isLow?"#1A1200":"rgba(255,255,255,0.7)",fontWeight:700,marginTop:1}}>ชิ้น</div>
          </div>
        </div>
      </div>

      {/* ไซส์ chips */}
      <div style={{padding:"10px 12px 6px",display:"flex",flexWrap:"wrap",gap:7}}>
        {SIZES.map(s=>(item.sizes[s]||0)>0?(
          <span key={s} style={{
            background:sChip[s]?.bg,color:sChip[s]?.tc,
            borderRadius:8,padding:"6px 12px",
            fontSize:15,fontWeight:800,
          }}>{s} × {item.sizes[s]}</span>
        ):null)}
        {total===0&&<span style={{fontSize:14,color:"#9CA3AF",fontWeight:600}}>หมดสต๊อก</span>}
      </div>

      {/* Tags + note */}
      {item.note&&(
        <div style={{padding:"0 12px 8px"}}>
          <span style={{background:"#FEF3C7",color:"#92400E",fontSize:12,fontWeight:700,borderRadius:6,padding:"3px 9px"}}>📌 {item.note}</span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{padding:"6px 10px 12px",display:"flex",gap:6}}>
        <button onClick={()=>onStock(item)} style={{
          flex:2,padding:"12px 0",borderRadius:10,fontWeight:800,fontSize:15,
          background:`linear-gradient(135deg,${T.gold1},${T.gold2})`,
          color:T.g1,border:"none",cursor:"pointer",
          boxShadow:`0 3px 8px ${T.gold1}55`,
        }}>✏️ แก้ไขสต๊อก</button>
        <button onClick={()=>onEdit(item)} style={{
          flex:1,padding:"12px 0",borderRadius:10,fontWeight:700,fontSize:13,
          background:T.accentLight,color:T.text2,
          border:`1.5px solid ${T.border}`,cursor:"pointer",
        }}>แก้ไข</button>
        <button onClick={()=>onDelete(item.id)} style={{
          width:42,padding:"12px 0",borderRadius:10,fontSize:16,
          background:"#FFF1F2",color:"#DC2626",
          border:"1.5px solid #FECDD3",cursor:"pointer",
        }}>🗑</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [store,setStore]         = useState("iwa");
  const [iwaStock,setIwaStock]   = useState(DEF_IWA);
  const [unifStock,setUnifStock] = useState(DEF_UNIF);
  const [iwaLogs,setIwaLogs]     = useState([]);
  const [unifLogs,setUnifLogs]   = useState([]);
  const [loaded,setLoaded]       = useState(false);
  const [syncing,setSyncing]     = useState(false);
  const [lastSync,setLastSync]   = useState(null);
  const localTs = useRef({ iwa:0, unif:0 });

  const T       = THEMES[store];
  const stock   = store==="iwa" ? iwaStock  : unifStock;
  const logs    = store==="iwa" ? iwaLogs   : unifLogs;
  const LOCS    = getLocs(store);

  const [search,setSearch]       = useState("");
  const [filterCat,setFilterCat] = useState("all");
  const [filterLoc,setFilterLoc] = useState("all");
  const [filterSub,setFilterSub] = useState("all"); // เสื้อยืด/ตุ้งติ้ง/โซล่อน
  const [showDash,setShowDash]   = useState(false);
  const [stockModal,setStockModal] = useState(null);
  const [editModal,setEditModal]   = useState(null);

  // Load
  useEffect(()=>{
    (async()=>{
      const [is,us,il,ul]=await Promise.all([sGet(KEY_IWA),sGet(KEY_UNIF),sGet(KEY_ILOGS),sGet(KEY_ULOGS)]);
      if(is) setIwaStock(is.data||DEF_IWA);
      if(us) setUnifStock(us.data||DEF_UNIF);
      if(il) setIwaLogs(il);
      if(ul) setUnifLogs(ul);
      setLoaded(true);setLastSync(new Date());
    })();
  },[]);

  // Poll
  useEffect(()=>{
    if(!loaded)return;
    const id=setInterval(async()=>{
      setSyncing(true);
      const [is,us,il,ul]=await Promise.all([sGet(KEY_IWA),sGet(KEY_UNIF),sGet(KEY_ILOGS),sGet(KEY_ULOGS)]);
      if(is&&is.ts>localTs.current.iwa){setIwaStock(is.data);localTs.current.iwa=is.ts;}
      if(us&&us.ts>localTs.current.unif){setUnifStock(us.data);localTs.current.unif=us.ts;}
      if(il)setIwaLogs(il);
      if(ul)setUnifLogs(ul);
      setLastSync(new Date());setSyncing(false);
    },POLL_MS);
    return()=>clearInterval(id);
  },[loaded]);

  const saveStock=useCallback(async(key,data)=>{
    const ts=Date.now();await sSet(key,{data,ts});return ts;
  },[]);

  // Stats
  const today=todayStr();
  const todayLogs=useMemo(()=>logs.filter(l=>l.date===today),[logs,today]);
  const todayOut=useMemo(()=>todayLogs.filter(l=>l.type==="sell").reduce((s,l)=>s+Math.abs(l.qty),0),[todayLogs]);
  const todayIn=useMemo(()=>todayLogs.filter(l=>l.type==="buy").reduce((s,l)=>s+l.qty,0),[todayLogs]);
  const totalStock=useMemo(()=>stock.reduce((s,p)=>s+totalSz(p.sizes),0),[stock]);
  const lowCount=useMemo(()=>stock.filter(p=>{const t=totalSz(p.sizes);return t>0&&t<=3;}).length,[stock]);

  const filtered=useMemo(()=>stock.filter(p=>{
    // filter หมวดหลัก
    if(filterCat!=="all"&&p.cat!==filterCat)return false;
    // filter ตำแหน่ง
    if(filterLoc!=="all"&&p.loc!==filterLoc)return false;
    // sub-filter เฉพาะ uniform + หมวดเสื้อ
    if(store==="uniform"&&filterSub!=="all"&&p.cat==="👚 เสื้อ"){
      const n=p.name.toLowerCase();
      if(filterSub==="ตุ้งติ้ง"&&!n.includes("ตุ้งติ้ง"))return false;
      if(filterSub==="ยืด"&&!n.includes("ยืด"))return false;
      if(filterSub==="โซล่อน"&&(n.includes("ยืด")||n.includes("ตุ้งติ้ง")||p.name==="เสื้อชาย"||p.name==="มยุรี"))return false;
      if(filterSub==="ชาย"&&p.name!=="เสื้อชาย"&&p.name!=="มยุรี")return false;
    }
    if(search){const q=search.toLowerCase();return p.name.toLowerCase().includes(q)||p.color.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q);}
    return true;
  }),[stock,search,filterCat,filterLoc,filterSub,store]);

  const catCounts=useMemo(()=>{const r={};for(const p of stock)r[p.cat]=(r[p.cat]||0)+totalSz(p.sizes);return r;},[stock]);

  async function handleUpdate(u){
    const next=store==="iwa"?iwaStock.map(p=>p.id===u.id?u:p):unifStock.map(p=>p.id===u.id?u:p);
    if(store==="iwa"){setIwaStock(next);const ts=await saveStock(KEY_IWA,next);localTs.current.iwa=ts;}
    else{setUnifStock(next);const ts=await saveStock(KEY_UNIF,next);localTs.current.unif=ts;}
  }
  async function handleSave(item){
    const prev=store==="iwa"?iwaStock:unifStock;
    const next=prev.some(p=>p.id===item.id)?prev.map(p=>p.id===item.id?item:p):[...prev,item];
    if(store==="iwa"){setIwaStock(next);const ts=await saveStock(KEY_IWA,next);localTs.current.iwa=ts;}
    else{setUnifStock(next);const ts=await saveStock(KEY_UNIF,next);localTs.current.unif=ts;}
  }
  async function handleDelete(id){
    if(!window.confirm("ลบสินค้านี้?"))return;
    const next=store==="iwa"?iwaStock.filter(p=>p.id!==id):unifStock.filter(p=>p.id!==id);
    if(store==="iwa"){setIwaStock(next);const ts=await saveStock(KEY_IWA,next);localTs.current.iwa=ts;}
    else{setUnifStock(next);const ts=await saveStock(KEY_UNIF,next);localTs.current.unif=ts;}
  }
  async function handleLog(log){
    if(store==="iwa"){const next=[...iwaLogs,log];setIwaLogs(next);await sSet(KEY_ILOGS,next);}
    else{const next=[...unifLogs,log];setUnifLogs(next);await sSet(KEY_ULOGS,next);}
  }
  const switchStore=s=>{setStore(s);setSearch("");setFilterCat("all");setFilterLoc("all");setFilterSub("all");};
  const syncTime=lastSync?lastSync.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"";

  if(!loaded)return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0A0800",gap:12}}>
      <div style={{fontSize:36}}>🌿</div>
      <div style={{color:"#C9912A",fontSize:15,fontWeight:700,fontFamily:"'Sarabun',sans-serif"}}>กำลังโหลดข้อมูล...</div>
      <div style={{color:"rgba(255,255,255,0.3)",fontSize:11,fontFamily:"'Sarabun',sans-serif"}}>IwaUniformSpa Stock System</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Sarabun',sans-serif",transition:"background .3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${T.gold2};border-radius:99px}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      <StoreSwitcher active={store} onChange={switchStore}
        iwaTot={iwaStock.reduce((s,p)=>s+totalSz(p.sizes),0)}
        unifTot={unifStock.reduce((s,p)=>s+totalSz(p.sizes),0)}/>

      {/* HEADER */}
      <div style={{background:`linear-gradient(160deg,${T.g1} 0%,${T.g2} 60%,${T.g1}ee 100%)`,position:"relative",overflow:"hidden"}}>
        <div style={{height:2,background:`linear-gradient(90deg,transparent,${T.gold1},${T.gold2},${T.gold1},transparent)`}}/>
        <div style={{maxWidth:480,margin:"0 auto",padding:"13px 13px 0",position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:58,height:58,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,filter:`drop-shadow(0 4px 10px ${T.gold1}66)`}}>
              <IwaLogo size={56} store={store}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:900,fontSize:17,background:`linear-gradient(135deg,${T.gold3},${T.gold2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{T.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:syncing?"#FCD34D":"#22C55E",display:"inline-block",animation:syncing?"pulse 1s infinite":"none"}}/>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:600}}>
                  {syncing?"กำลังซิงค์...":"Real-time · "+syncTime}
                </span>
              </div>
            </div>
            <button onClick={()=>setShowDash(true)} style={{background:`linear-gradient(135deg,${T.gold1},${T.gold2})`,border:"none",borderRadius:10,padding:"8px 11px",color:T.g1,fontWeight:800,fontSize:11,cursor:"pointer",flexShrink:0,boxShadow:`0 4px 10px ${T.gold1}55`}}>
              📊 วันนี้{todayLogs.length>0&&<span style={{background:T.g1,color:T.gold3,borderRadius:99,padding:"0 4px",fontSize:9,marginLeft:3}}>{todayLogs.length}</span>}
            </button>
          </div>
          <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
            {[{i:"📦",l:"สต๊อกรวม",v:totalStock,c:T.gold3},{i:"🛍️",l:"ขายวันนี้",v:todayOut,c:"#FCA5A5"},{i:"📥",l:"รับวันนี้",v:todayIn,c:"#86EFAC"},{i:"⚠️",l:"ใกล้หมด",v:lowCount,c:"#FCD34D"}].map((s,i)=>(
              <div key={s.l} style={{flex:1,padding:"8px 4px",textAlign:"center",borderRight:i<3?"1px solid rgba(255,255,255,0.06)":"none"}}>
                <div style={{fontSize:13}}>{s.i}</div>
                <div style={{fontWeight:900,fontSize:15,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.4)",marginTop:1,fontWeight:600}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{height:2,background:`linear-gradient(90deg,transparent,${T.gold1},${T.gold2},${T.gold1},transparent)`}}/>
      </div>

      {/* BODY */}
      <div style={{maxWidth:480,margin:"0 auto",padding:"12px 12px 72px"}}>
        {/* Search */}
        <div style={{background:T.card,borderRadius:14,padding:"11px 13px",display:"flex",alignItems:"center",gap:8,marginBottom:10,border:`2px solid ${T.border}`,boxShadow:`0 2px 8px ${T.gold1}11`}}>
          <span style={{fontSize:18,color:T.gold1}}>🔍</span>
          <input type="text" placeholder="ค้นหาชื่อ สี หมวด..." value={search} onChange={e=>{setSearch(e.target.value);setFilterCat("all");setFilterLoc("all");}}
            style={{flex:1,border:"none",outline:"none",fontSize:15,color:T.text2,background:"transparent",fontFamily:"'Sarabun',sans-serif"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{border:"none",background:"none",cursor:"pointer",color:T.text3,fontSize:16}}>✕</button>}
        </div>
        {/* Cat filter */}
        <div style={{marginBottom:8,overflowX:"auto",display:"flex",gap:6,paddingBottom:2}}>
          {[{v:"all",l:"ทั้งหมด"},...CATS.map(c=>({v:c,l:c}))].map(f=>(
            <button key={f.v} onClick={()=>{setFilterCat(f.v);setFilterSub("all");}} style={{
              flexShrink:0,padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:700,cursor:"pointer",
              border:`2px solid ${filterCat===f.v?T.g1:T.border}`,
              background:filterCat===f.v?T.g1:T.card,
              color:filterCat===f.v?"#FFFFFF":"#1A1A1A",
              whiteSpace:"nowrap",
              boxShadow:filterCat===f.v?`0 2px 8px ${T.g1}44`:"none",
            }}>
              {f.l}{filterCat===f.v&&catCounts[f.v]?` (${catCounts[f.v]})`:""}
            </button>
          ))}
        </div>

        {/* Sub-filter เฉพาะ ไอวาร์ยูนิฟอร์ม + หมวดเสื้อ */}
        {store==="uniform"&&(filterCat==="all"||filterCat==="👚 เสื้อ")&&(
          <div style={{marginBottom:8,overflowX:"auto",display:"flex",gap:6,paddingBottom:2}}>
            {[
              {v:"all",      l:"ทั้งหมด"},
              {v:"ตุ้งติ้ง", l:"ตุ้งติ้ง"},
              {v:"ยืด",      l:"เสื้อยืด"},
              {v:"โซล่อน",   l:"เสื้อโซล่อน"},
              {v:"ชาย",      l:"เสื้อผู้ชาย"},
            ].map(f=>(
              <button key={f.v} onClick={()=>setFilterSub(f.v)} style={{
                flexShrink:0,padding:"7px 13px",borderRadius:16,fontSize:13,fontWeight:700,cursor:"pointer",
                border:`2px solid ${filterSub===f.v?"#1A4A9E":T.border}`,
                background:filterSub===f.v?"#1A4A9E":T.card,
                color:filterSub===f.v?"#FFFFFF":"#1A1A1A",
                whiteSpace:"nowrap",
                boxShadow:filterSub===f.v?"0 2px 8px #1A4A9E44":"none",
              }}>{f.l}</button>
            ))}
          </div>
        )}
        {/* Loc filter — แสดงเฉพาะ iwa spa */}
        {store==="iwa"&&(
        <div style={{marginBottom:11,overflowX:"auto",display:"flex",gap:6,paddingBottom:2}}>
          {[{v:"all",l:"📍 ทุกที่"},...LOCS.map(l=>({v:l,l:`📦 ${l}`}))].map(f=>(
            <button key={f.v} onClick={()=>setFilterLoc(f.v)} style={{
              flexShrink:0,padding:"6px 12px",borderRadius:16,fontSize:12,fontWeight:700,cursor:"pointer",
              border:`2px solid ${filterLoc===f.v?T.gold1:T.border}`,
              background:filterLoc===f.v?T.gold1:T.card,
              color:filterLoc===f.v?"#1A0F00":"#1A1A1A",
              whiteSpace:"nowrap",
            }}>{f.l}</button>
          ))}
        </div>
        )}
        {/* Count + Add */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text3}}>พบ <b style={{fontSize:16,color:T.text2}}>{filtered.length}</b> รายการ</div>
          <button onClick={()=>setEditModal("new")} style={{background:`linear-gradient(135deg,${T.g1},${T.g2})`,color:T.gold3,border:"none",borderRadius:12,padding:"10px 18px",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:`0 3px 10px ${T.g1}44`}}>+ เพิ่มสินค้า</button>
        </div>
        {/* Cards */}
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:28,marginBottom:6}}>🔍</div><div style={{color:T.text3,fontSize:12,fontWeight:600}}>ไม่พบสินค้า</div></div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(item=>(
              <div key={item.id} style={{animation:"fadeUp .2s ease"}}>
                <ProductCard T={T} item={item} onStock={setStockModal} onEdit={setEditModal} onDelete={handleDelete}/>
              </div>
            ))}
          </div>
        )}
        {/* Footer */}
        <div style={{marginTop:24,textAlign:"center",borderTop:`1px solid ${T.border}`,paddingTop:16}}>
          <IwaLogo size={30} store={store}/>
          <div style={{fontSize:9,color:T.text3,marginTop:3,fontWeight:600}}>{T.name} · Stock v6 · 🔴 Real-time</div>
        </div>
      </div>

      {stockModal&&<StockModal T={T} item={stockModal} onClose={()=>setStockModal(null)} onUpdate={async u=>{await handleUpdate(u);setStockModal(u);}} onLog={handleLog}/>}
      {editModal&&<ProductModal T={T} store={store} item={editModal==="new"?null:editModal} onClose={()=>setEditModal(null)} onSave={handleSave}/>}
      {showDash&&<DailyDash T={T} logs={logs} stock={stock} onClose={()=>setShowDash(false)}/>}
    </div>
  );
}
