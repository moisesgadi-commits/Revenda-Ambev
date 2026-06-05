import { db } from './src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const rawData = `ESTADO;CAPITAL/INTERIOR;Valor por Metro Cubico;prazo
AC;C; R$ 2.884,92 ;13
AC;I; R$ 3.783,27 ;16
AL;C; R$ 2.134,90 ;8
AL;I; R$ 2.897,51 ;11
AM;C; R$ 2.982,16 ;31
AM;I; R$ 4.418,52 ;35
AP;C; R$ 3.775,64 ;16
AP;I; R$ 4.014,72 ;19
BA;C; R$ 2.402,96 ;7
BA;I; R$ 4.036,45 ;9
CE;C; R$ 4.196,60 ;10
CE;I; R$ 4.658,74 ;13
DF;C; R$ 2.287,42 ;6
ES;C; R$ 2.995,12 ;5
ES;I; R$ 3.318,08 ;6
GO;C; R$ 2.783,50 ;6
MA;C; R$ 3.633,04 ;9
MA;I; R$ 5.032,79 ;13
MG;C; R$ 2.397,62 ;3
MG;I; R$ 2.494,47 ;5
MS;C; R$ 3.275,38 ;7
MT;C; R$ 3.275,38 ;7
PA;C; R$ 5.107,15 ;13
PA;I; R$ 4.956,53 ;16
PB;C; R$ 3.409,59 ;8
PB;I; R$ 4.651,49 ;11
PE;C; R$ 3.011,90 ;9
PE;I; R$ 4.804,01 ;12
PI;C; R$ 3.654,77 ;10
PI;I; R$ 3.893,08 ;14
PR;C; R$ 2.236,71 ;4
PR;I; R$ 2.494,47 ;5
RJ;C; R$ 2.122,32 ;3
RJ;I; R$ 2.494,47 ;4
RN;C; R$ 3.035,16 ;9
RN;I; R$ 4.562,65 ;12
RO;C; R$ 4.274,77 ;13
RO;I; R$ 5.190,27 ;16
RR;C; R$ 4.385,34 ;13
RR;I; R$ 5.420,19 ;16
RS;C; R$ 2.287,42 ;5
RS;I; R$ 3.774,50 ;6
SC;C; R$ 2.274,84 ;4
SC;I; R$ 3.164,80 ;5
SE;C; R$ 2.707,24 ;10
SE;I; R$ 3.785,94 ;13
SP;C; R$ 2.173,03 ;3
SP;I; R$ 2.717,15 ;4
TO;C; R$ 4.396,02 ;13
TO;I; R$ 4.889,04 ;16`;

const lines = rawData.split('\n').slice(1);
const rates: Record<string, any> = {};

lines.forEach(line => {
  const [uf, type, valueStr, prazoStr] = line.split(';');
  const cleanUf = uf.trim();
  const cleanType = type.trim();
  const val = parseFloat(valueStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.').trim()) || 0;
  const prazo = parseInt(prazoStr?.trim() || '0') || 0;
  
  if (!rates[cleanUf]) {
    rates[cleanUf] = { capital: 0, interior: 0, capitalDeliveryTime: 0, interiorDeliveryTime: 0 };
  }
  
  if (cleanType === 'C') {
    rates[cleanUf].capital = val;
    rates[cleanUf].capitalDeliveryTime = prazo;
  } else {
    rates[cleanUf].interior = val;
    rates[cleanUf].interiorDeliveryTime = prazo;
  }
});

async function run() {
  await setDoc(doc(db, 'settings', 'freight_v3'), { rates });
  console.log('Seeded freight v3');
  process.exit(0);
}

run();
