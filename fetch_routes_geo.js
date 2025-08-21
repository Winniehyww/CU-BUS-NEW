import fs from 'fs';
import fetch from 'node-fetch';

const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SUN_DAY = ['Sun'];

function toMin(hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
      }

function toHHMM(m) {
        m = ((m % 1440) + 1440) % 1440;
        const h = Math.floor(m / 60),
          mm = m % 60;
        return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }

function genDepartures(a, b, headway) {
        const A = toMin(a),
          B = toMin(b),
          out = [];
        for (let t = A; t <= B; t += headway) out.push(toHHMM(t));
        return out;
      }
      function genDeparturesSpecial(startHHMM, endHHMM, headway, opts = {}) {
        let times = genDepartures(startHHMM, endHHMM, headway);

        const toMinNum = (hhmm) => {
          const [h, m] = hhmm.split(':').map(Number);
          return h * 60 + m;
        };

        // --- Normalize helpers ---
        const normalizeToArray = (single, plural) => {
          const arr = [];
          if (single) arr.push(single);
          if (Array.isArray(plural)) arr.push(...plural);
          return arr;
        };

        // --- Remove patterns (unchanged logic, now via normalize helper) ---
        const removePatterns = normalizeToArray(
          opts.removePattern,
          opts.removePatterns
        );
        if (removePatterns.length) {
          for (const pat of removePatterns) {
            const fromMin = toMinNum(pat.from);
            const toMinVal = toMinNum(pat.to);
            times = times.filter((t) => {
              const m = toMinNum(t);
              const mm = m % 60;
              return !(m >= fromMin && m <= toMinVal && mm === pat.minute);
            });
          }
        }

        // --- Add patterns (now supports single or array) ---
        const addPatterns = normalizeToArray(opts.addPattern, opts.addPatterns);
        if (addPatterns.length) {
          for (const pat of addPatterns) {
            const fromMin = toMinNum(pat.from);
            const toMinVal = toMinNum(pat.to);
            for (let m = fromMin; m <= toMinVal; m += 60) {
              const hh = Math.floor(m / 60);
              const mm = pat.minute;
              const tStr = `${String(hh).padStart(2, '0')}:${String(
                mm
              ).padStart(2, '0')}`;
              if (!times.includes(tStr)) times.push(tStr);
            }
          }
          // Sort once after processing all add patterns
          times.sort((a, b) => toMinNum(a) - toMinNum(b));
        }

        return times;
      }

// 请根据你的实际文件路径调整
const STOPS = [
        {
          id: 'T1',
          name: {
            zh_hant: '大學站',
            en: 'University Station',
            zh_hans: '大学站',
          },
          lat: 22.414522,
          lng: 114.210222,
          routes: ['1A', '1B', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'T2',
          name: {
            zh_hant: '大學站廣場',
            en: 'Station Piazza',
            zh_hans: '大学站广场',
          },
          lat: 22.413801,
          lng: 114.209436,
          routes: ['2', '2*', '6A', '6B', '7', '8*'],
        },
        {
          id: 'T3',
          name: {
            zh_hant: '康本園',
            en: 'YIAP',
            zh_hans: '康本园',
          },
          lat: 22.415975,
          lng: 114.210815,
          routes: ['3', '4'],
        },
        {
          id: 'U1',
          name: {
            zh_hant: '大學體育中心',
            en: 'Univ. Sports Centre',
            zh_hans: '大学体育中心',
          },
          lat: 22.417773,
          lng: 114.210595,
          routes: ['1A', '1B', '2', '2*', '3', '5', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'U2',
          name: {
            zh_hant: '邵逸夫堂',
            en: 'Sir Run Run Shaw Hall',
            zh_hans: '邵逸夫堂',
          },
          lat: 22.419833,
          lng: 114.206942,
          routes: ['1A', '1B', '2*', '5', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'U3',
          name: {
            zh_hant: '科學館',
            en: 'Science Centre',
            zh_hans: '科学馆',
          },
          lat: 22.419816,
          lng: 114.207341,
          routes: ['3', '8', '8*'],
        },
        {
          id: 'U4',
          name: {
            zh_hant: '馮景禧樓',
            en: 'Fung King Hey Bldg.',
            zh_hans: '冯景禧楼',
          },
          lat: 22.419851,
          lng: 114.203031,
          routes: ['2', '2*', '3', '5'],
        },
        {
          id: 'U5',
          name: {
            zh_hant: '聯合書院（上行）',
            en: 'United College (Upward)',
            zh_hans: '联合书院（上行）',
          },
          lat: 22.420409,
          lng: 114.205134,
          routes: ['2', '2*', '3', '5'],
        },
        {
          id: 'U6',
          name: {
            zh_hant: '新亞書院',
            en: 'New Asia College',
            zh_hans: '新亚书院',
          },
          lat: 22.421299,
          lng: 114.207475,
          routes: ['2', '2*', '4', '6A', '6B', '7', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'U7',
          name: {
            zh_hant: '新亞坊',
            en: 'New Asia Circle',
            zh_hans: '新亚坊',
          },
          lat: 22.421081,
          lng: 114.207623,
          routes: ['8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'D1',
          name: {
            zh_hant: '善衡書院',
            en: 'S.H. Ho College',
            zh_hans: '善衡书院',
          },
          lat: 22.418033,
          lng: 114.209849,
          routes: [
            '1A',
            '1B',
            '2',
            '2*',
            '3',
            '4',
            '6A',
            '6B',
            '7',
            'N',
            'N*',
            'H',
            'H*',
          ],
        },
        {
          id: 'D2',
          name: {
            zh_hant: '大學行政樓',
            en: 'Univ. Admin. Bldg.',
            zh_hans: '大学行政楼',
          },
          lat: 22.418785,
          lng: 114.20544,
          routes: [
            '1A',
            '1B',
            '2',
            '2*',
            '3',
            '4',
            '6A',
            '6B',
            '7',
            '8',
            '8*',
            'N',
            'N*',
            'H',
            'H*',
          ],
        },
        {
          id: 'D3',
          name: {
            zh_hant: '聯合書院（下行）',
            en: 'United College (Downward)',
            zh_hans: '联合书院（下行）',
          },
          lat: 22.420277,
          lng: 114.205314,
          routes: ['2', '2*', '4', '6A', '6B', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'B1',
          name: {
            zh_hant: '伍宜孫書院（往後山）',
            en: 'W.Y.S College (To Residence)',
            zh_hans: '伍宜孙书院（往後山）',
          },
          lat: 22.421304,
          lng: 114.203471,
          routes: ['3', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'B2',
          name: {
            zh_hant: '逸夫書院',
            en: 'Shaw College',
            zh_hans: '逸夫书院',
          },
          lat: 22.422454,
          lng: 114.201285,
          routes: ['3', '4', '5', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'B3',
          name: {
            zh_hant: '敬文書院（往本部）',
            en: 'CW.Chu College (To Main Campus)',
            zh_hans: '敬文书院（往本部）',
          },
          lat: 22.425665,
          lng: 114.206078,
          routes: ['3', '4', '5', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'B4',
          name: {
            zh_hant: '十五苑',
            en: 'Residence No.15',
            zh_hans: '十五苑',
          },
          lat: 22.423654,
          lng: 114.206593,
          routes: ['3', '4', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'B5',
          name: {
            zh_hant: '聯合苑',
            en: 'U.C. Staff Residence',
            zh_hans: '联合苑',
          },
          lat: 22.423218,
          lng: 114.205134,
          routes: ['3', '4', '6A', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'B6',
          name: {
            zh_hant: '陳震夏宿舍',
            en: 'Chan Chun Ha Hostel',
            zh_hans: '陈震夏宿舍',
          },
          lat: 22.42178,
          lng: 114.20463,
          routes: ['3', '4', '6A', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'B7',
          name: {
            zh_hant: '伍宜孫書院（往本部）',
            en: 'W.Y.S College (To Main Campus)',
            zh_hans: '伍宜孙书院（往本部）',
          },
          lat: 22.420986,
          lng: 114.203503,
          routes: ['3', '4', '6A', '7', '8', '8*', 'N', 'N*', 'H', 'H*'],
        },
        {
          id: 'W1',
          name: {
            zh_hant: '39區',
            en: 'Area 39',
            zh_hans: '39区',
          },
          lat: 22.427621,
          lng: 114.204353,
          routes: ['4', '8', '8*', 'N', 'N*', 'H*'],
        },
        {
          id: 'W2',
          name: {
            zh_hant: '敬文書院（往39區）',
            en: 'CW.Chu (To Area 39)',
            zh_hans: '敬文书院（往39区）',
          },
          lat: 22.425489,
          lng: 114.206287,
          routes: ['4'],
        },
        {
          id: 'W3',
          name: {
            zh_hant: '環迴北站',
            en: 'Campus Circuit North',
            zh_hans: '环回北站',
          },
          lat: 22.425603,
          lng: 114.206464,
          routes: ['8', '8*'],
        },
        {
          id: 'W4',
          name: {
            zh_hant: '環迴東站（往大學站）',
            en: 'Campus Circuit East (To MTR)',
            zh_hans: '环回东站（往大学站）',
          },
          lat: 22.419186,
          lng: 114.212995,
          routes: ['8', '8*'],
        },
        {
          id: 'W5',
          name: {
            zh_hant: '環迴東站（往39區）',
            en: 'Campus Circuit East (To Area 39)',
            zh_hans: '环回东站（往39区）',
          },
          lat: 22.419273,
          lng: 114.212859,
          routes: ['4'],
        },
        {
          id: 'X1',
          name: {
            zh_hant: '研究生宿舍一座',
            en: 'PGH 1',
            zh_hans: '研究生宿舍一座',
          },
          lat: 22.420228,
          lng: 114.212177,
          routes: ['1B', 'N*', 'H*'],
        },
        {
          id: 'X2',
          name: {
            zh_hant: '十苑',
            en: 'Residence No.10',
            zh_hans: '十苑',
          },
          lat: 22.424517,
          lng: 114.208299,
          routes: ['H', 'H*'],
        },
        {
          id: 'X3',
          name: {
            zh_hant: '崇基教學樓',
            en: 'Chung Chi Teaching Bldg.',
            zh_hans: '崇基教学楼',
          },
          lat: 22.415988,
          lng: 114.208363,
          routes: ['5', '6A', '6B', '7', '8*'],
        },
        {
          id: 'S1',
          name: {
            zh_hant: '大學站（落客站）',
            en: 'University Station (Alighting)',
            zh_hans: '大学站（落客站）',
          },
          lat: 22.415368,
          lng: 114.210643,
          routes: ['1A', '1B', '2', '2*', '3', '4', '8', 'N', 'H'],
        },
      ];

      const ROUTES = [
        {
          id: '1A',
          color: '#F59E0B',
          name: '本部線A',
          line: '1A',
          stops: ['T1', 'U1', 'U2', 'D2', 'D1', 'S1'],
          stopOffsets: [0, 2, 4, 6, 8, 10],
          departures: genDeparturesSpecial('07:40', '18:50', 10, {
            removePatterns: [
              { minute: 0, from: '07:40', to: '18:50' },
              { minute: 30, from: '07:40', to: '18:50' },
            ],
          }),
          service:
            '07:40-18:50 · 約每 10 分鐘一班 · 預定班次每小時20, 40分發車',
          comment: '連接大學站與本部校園。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '1B',
          color: '#B97B4A',
          name: '本部線B（停研究生宿舍1座）',
          line: '1B',
          stops: ['T1', 'X1', 'U1', 'U2', 'D2', 'D1', 'X1', 'S1'],
          stopOffsets: [0, 2, 4, 6, 8, 10, 12, 14],
          departures: genDepartures('08:00', '18:30', 30),
          service: '08:00-18:30 · 每 30 分鐘一班',
          comment: '連接大學站與本部校園（經研宿一座）。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '2',
          color: '#ED5797',
          name: '新聯線',
          line: '2',
          stops: ['T2', 'U1', 'U4', 'U5', 'U6', 'D3', 'D2', 'D1', 'S1'],
          stopOffsets: [0, 2, 4, 5, 7, 8, 10, 12, 14],
          departures: genDeparturesSpecial('07:15', '18:45', 60, {
            addPatterns: [{ minute: 30, from: '07:15', to: '18:45' }],
          }),
          service: '07:45-18:45 · 約每 15 分鐘一班',
          comment:
            '連接大學站與新亞書院及聯合書院（逢31至00分開出的班次將停邵逸夫堂）。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '2*',
          color: '#ED5797',
          name: '新聯線（經邵逸夫堂）',
          line: '2',
          stops: ['T2', 'U1', 'U2', 'U4', 'U5', 'U6', 'D3', 'D2', 'D1', 'S1'],
          stopOffsets: [0, 2, 4, 6, 7, 9, 11, 13, 16, 18],
          departures: genDeparturesSpecial('08:00', '18:45', 60, {
            addPatterns: [{ minute: 45, from: '07:15', to: '18:45' }],
          }),
          service: '07:45-18:45 · 約每 15 分鐘一班',
          comment:
            '連接大學站與新亞書院及聯合書院（逢31至00分開出的班次將停邵逸夫堂）。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '3',
          color: '#3B8D5D',
          name: '逸夫線',
          line: '3',
          stops: [
            'T3',
            'U1',
            'U3',
            'U4',
            'B1',
            'B2',
            'B3',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'D2',
            'D1',
            'S1',
          ],
          stopOffsets: [0, 1, 3, 4, 5, 7, 9, 10, 11, 12, 14, 16, 17, 19, 20],
          departures: genDepartures('09:00', '18:40', 20),
          service: '09:00-18:40 · 每 20 分鐘一班',
          comment: '連接大學站及逸夫書院。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '4',
          color: '#F66E0B',
          name: '環迴線',
          line: '4',
          stops: [
            'T3',
            'W5',
            'W2',
            'W1',
            'B3',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'U6',
            'D3',
            'D2',
            'D1',
            'S1',
          ],
          stopOffsets: [0, 2, 4, 5, 6, 7, 8, 9, 11, 13, 15, 16, 17, 19, 20],
          departures: genDepartures('07:30', '18:50', 20),
          service: '06:30-22:30 · 每 20 分鐘一班',
          comment: '連接大學站及後山宿舍區。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '5',
          color: '#47ABDC',
          name: '上行線',
          line: '5',
          stops: ['X3', 'U1', 'U2', 'U4', 'U5', 'U6', 'B1', 'B2', 'B3'],
          stopOffsets: [0, 2, 4, 5, 6, 8, 10, 11, 13],
          departures: genDeparturesSpecial('09:18', '17:26', 60, {
            addPatterns: [
              { minute: 22, from: '09:18', to: '17:26' },
              { minute: 26, from: '09:18', to: '17:26' },
            ],
          }),
          service: '教學日09:18-17:26 · 每小時 18,22,26 分由崇基教學樓開出',
          comment: '由崇基教學樓前往敬文書院。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '6A',
          color: '#5A5C26',
          name: '下行線（敬文）',
          line: '6A',
          stops: [
            'B3',
            'B5',
            'B6',
            'B2',
            'B7',
            'U6',
            'D3',
            'D2',
            'D1',
            'T2',
            'X3',
          ],
          stopOffsets: [0, 2, 3, 5, 7, 9, 11, 12, 14, 16, 18],
          departures: genDepartures('09:10', '17:10', 60),
          service: '教學日09:10-17:10 · 每 60 分鐘一班',
          comment: '由敬文書院前往崇基教學樓。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '6B',
          color: '#404B92',
          name: '下行線（新聯）',
          line: '6B',
          stops: ['U6', 'D3', 'D2', 'D1', 'T2', 'X3'],
          stopOffsets: [0, 1, 3, 5, 7],
          departures: genDepartures('12:20', '17:20', 60),
          service: '教學日12:20-17:20 · 每 60 分鐘一班',
          comment: '由新亞書院前往崇基教學樓。',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          publicHoliday: false,
        },
        {
          id: '7',
          color: '#942944',
          name: '下行線（逸夫）',
          line: '7',
          stops: ['B2', 'B7', 'U6', 'D3', 'D2', 'D1', 'T2', 'X3'],
          stopOffsets: [0, 1, 3, 5, 7, 9, 11, 13],
          departures: genDeparturesSpecial('08:18', '17:50', 60, {
            addPatterns: [{ minute: 50, from: '08:18', to: '17:50' }],
          }),
          service: '教學日08:18-17:50 · 每小時 18,50 分由逸夫書院開出',
          comment: '由逸夫書院前往崇基教學樓。',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '8',
          color: '#FFC760',
          name: '西部線',
          line: '8',
          stops: [
            'W1',
            'B3',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'D2',
            'U3',
            'U7',
            'D3',
            'B1',
            'B2',
            'W1',
            'W3',
            'W4',
            'S1',
          ],
          stopOffsets: [
            0, 1, 2, 3, 4, 6, 8, 10, 12, 13, 14, 15, 17, 20, 21, 23, 25,
          ],
          departures: genDepartures('07:40', '18:40', 20),
          service: '07:40-18:40 · 每 20 分鐘一班',
          comment:
            '連接後山宿舍區，本部校園及大學站 ＃非教學日期間將停大學站廣場及崇基教學樓',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: '8*',
          color: '#FFC760',
          name: '西部線（往崇基教學樓）',
          line: '8',
          stops: [
            'W1',
            'B3',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'D2',
            'U3',
            'U7',
            'D3',
            'B1',
            'B2',
            'W1',
            'W3',
            'W4',
            'T2',
            'X3',
          ],
          stopOffsets: [
            0, 1, 2, 3, 4, 6, 8, 10, 12, 13, 14, 15, 17, 20, 21, 23, 25, 27,
          ],
          departures: genDepartures('07:40', '18:40', 20),
          service: '07:40-18:40 · 每 20 分鐘一班',
          comment:
            '連接後山宿舍區，本部校園及大學站 ＃非教學日期間將停大學站廣場及崇基教學樓',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: 'N',
          color: '#836EED',
          name: '晚間線',
          line: 'N',
          stops: [
            'T1',
            'U1',
            'U2',
            'U7',
            'D3',
            'B1',
            'B2',
            'W1',
            'B3',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'U6',
            'D3',
            'D2',
            'D1',
            'S1',
          ],
          stopOffsets: [
            0, 2, 3, 5, 6, 7, 9, 11, 12, 13, 14, 15, 17, 19, 20, 21, 23, 25,
            26,
          ],
          departures: genDeparturesSpecial('19:00', '23:30', 15, {
            removePatterns: [{ minute: 0, from: '19:00', to: '23:30' }],
            addPatterns: [
              { minute:  8, from: '19:00', to: '23:30' },
              { minute: 23, from: '19:00', to: '23:30' },
              { minute: 38, from: '19:00', to: '23:30' },
              { minute: 53, from: '19:00', to: '23:30' },
            ],
          }),
          service: '19:00–23:30 · 約每 8 分鐘一班 · 預定班次每小時00, 15, 30, 45分發車',
          comment: '夜間環線（逢00分開出的班次將停研究生宿舍一座）',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: 'N*',
          color: '#836EED',
          name: '晚間線（經研宿一座）',
          line: 'N',
          stops: [
            'T1',
            'X1',
            'U1',
            'U2',
            'U7',
            'D3',
            'B1',
            'B2',
            'W1',
            'B3',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'U6',
            'D3',
            'D2',
            'D1',
            'X1',
            'S1',
          ],
          stopOffsets: [
            0, 2, 4, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 18, 20, 22, 23, 24, 26, 28, 30,
          ],
          departures: genDepartures('19:00', '23:30', 60),
          service: '19:00–23:30 · 約每 8 分鐘一班 · 預定班次每小時00, 15, 30, 45分發車',
          comment: '夜間環線（逢00分開出的班次將停研究生宿舍一座）',
          days: WORK_DAYS,
          publicHoliday: false,
        },
        {
          id: 'H',
          color: '#513989',
          name: '假日線',
          line: 'H',
          stops: [
            'T1',
            'U1',
            'U2',
            'U7',
            'D3',
            'B1',
            'B2',
            'B3',
            'X2',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'U6',
            'D3',
            'D2',
            'D1',
            'S1',
          ],
          stopOffsets: [
            0, 2, 3, 5, 6, 7, 9, 11, 13, 14, 15, 16, 18, 20, 21, 22, 24, 26, 28, 
          ],
          departures: genDeparturesSpecial('08:20', '23:20', 10, {
            removePatterns: [{ minute: 0, from: '08:20', to: '23:20' }],
          }),
          service: '08:20–23:20 · 約每 10 分鐘一班 · 預定班次#20,40,00分開出',
          comment: '假日環線（逢00分開出的班次將停研究生宿舍一座及39區）',
          days: SUN_DAY,
          publicHoliday: true,
        },
        {
          id: 'H*',
          color: '#513989',
          name: '假日線（經研宿一座及39區）',
          line: 'H',
          stops: [
            'T1',
            'X1',
            'U1',
            'U2',
            'U7',
            'D3',
            'B1',
            'B2',
            'W1',
            'B3',
            'X2',
            'B4',
            'B5',
            'B6',
            'B2',
            'B7',
            'U6',
            'D3',
            'D2',
            'D1',
            'X1',
            'S1',
          ],
          stopOffsets: [
            0, 2, 4, 6, 8, 9, 10, 11, 13, 15, 16, 18, 19, 20, 21, 23, 25, 26,
            27, 29, 31, 33, 35,
          ],
          departures: genDepartures('09:00', '23:20', 60),
          service: '08:20–23:20 · 約每 10 分鐘一班 · 預定班次#20,40,00分開出',
          comment: '假日環線（逢00分開出的班次將停研究生宿舍一座及39區）',
          days: SUN_DAY,
          publicHoliday: true,
        },
      ];

// OpenRouteService API Key（请替换为你自己的）
const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImFkNDViNWVmYjY3YjQ0MTI5ZjM3Yzk3NGM5ZmY0YmUxIiwiaCI6Im11cm11cjY0In0=';
const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

// 站点ID查找
function getStopById(id) {
  return STOPS.find(s => s.id === id);
}

// 请求单条路线的GeoJSON
async function fetchRouteGeo(route) {
  const coords = route.stops.map(sid => {
    const s = getStopById(sid);
    return [s.lng, s.lat];
  });
  const body = { coordinates: coords, instructions: false };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Failed: ${route.id}`);
  return await res.json();
}

(async () => {
  const out = {};
  for (const route of ROUTES) {
    try {
      out[route.id] = await fetchRouteGeo(route);
      console.log('Fetched:', route.id);
      await new Promise(r => setTimeout(r, 1200)); // 防止API限流
    } catch (e) {
      console.error('Error:', route.id, e);
    }
  }
  fs.writeFileSync('bus_routes_geo.json', JSON.stringify(out, null, 2));
  console.log('All routes saved to bus_routes_geo.json');
})();