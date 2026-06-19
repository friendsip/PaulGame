// ============================================================================
//  The Voyages of Paul — World Data
//  Each "town" is an island the player can sail to. Positions are laid out to
//  loosely echo the eastern-Mediterranean geography of the journeys in Acts,
//  arranged east (start, Antioch/Jerusalem) to west (Rome, the destination).
//
//  Each town carries:
//    history / world  — two parts of historical detail (shown in the panel)
//    event            — the signature dramatic scene played on first arrival
//    relic            — the collectible letter/keepsake found on the island
//    log              — a first-person ("we") line added to the Journal
// ============================================================================

export const THEMES = {
  levant:   { sand: 0xd9c08a, rock: 0xb0a07a, grass: 0x9caf6b, accent: 0xe8d8a0 },
  cyprus:   { sand: 0xe6d2a0, rock: 0xc9b58a, grass: 0xa7bd76, accent: 0xf0e2b0 },
  anatolia: { sand: 0xcdb98a, rock: 0x9c8f72, grass: 0x8fa45f, accent: 0xd8c79a },
  greece:   { sand: 0xe8ddc0, rock: 0xcfc6b2, grass: 0x9fb878, accent: 0xf2ead2 },
  italy:    { sand: 0xddc9a0, rock: 0xb6a888, grass: 0x95ab66, accent: 0xe6d6b0 },
};

// Event "fx" types drive the cinematic effects in the engine:
//   'commission' warm glow · 'blind' darkness · 'depart' somber ·
//   'mob' red shake · 'stones' hard impacts · 'vision' soft glow ·
//   'quake' violent shake · 'chant' big repeated cry + shake ·
//   'debate' cool flashes · 'farewell' somber · 'appeal' gold flash ·
//   'snake' green flash + shake · 'arrive' triumphant glow

export const TOWNS = [
  {
    id: 'damascus', name: 'Damascus', theme: 'levant',
    pos: [1380, -40], radius: 160, landmark: 'forum', order: 0,
    conversion: true,                       // triggers the special conversion sequence
    tagline: 'The road where Saul the persecutor became Paul the apostle.',
    history:
      'Damascus is one of the oldest continuously inhabited cities on earth, a great caravan ' +
      'city set in a green oasis. Saul of Tarsus was travelling here with letters to arrest ' +
      'followers of the Way when, near the city, a light from heaven flashed around him, and the ' +
      'risen Jesus spoke: "Saul, Saul, why do you persecute me?" (Acts 9). Blinded, Saul was led ' +
      'into the city, and for three days he neither ate nor saw.',
    world:
      'The Lord then sent a disciple named Ananias to a house on the street called Straight — the ' +
      'arrow-straight Roman road, the Via Recta, that still runs through old Damascus today. ' +
      'Ananias laid his hands on Saul; "something like scales" fell from his eyes, and he could ' +
      'see (Acts 9:10-19). The persecutor became the preacher. Saul later escaped the city over ' +
      'the wall, lowered in a basket (Acts 9:25; 2 Cor 11:33).',
    event: { fx: 'commission', title: 'The Road to Damascus', big: '', lines: [] },
    relic: { name: 'The Road to Damascus',
      found: 'You take up the account of the day everything changed — when Saul became Paul.' },
    log: 'On the road to Damascus a light struck me down, and the Lord made me his own; Ananias restored my sight.',
  },
  {
    id: 'antioch', name: 'Antioch in Syria', theme: 'levant',
    pos: [1180, 240], radius: 175, landmark: 'forum', order: 1,
    tagline: 'Where the journeys begin — and where believers were first called Christians.',
    history:
      'Antioch on the Orontes was the third-largest city of the Roman Empire, after Rome and ' +
      'Alexandria, with perhaps half a million people. It was famous for its colonnaded main ' +
      'street, two miles long and lit by lamps at night. In Acts it is the great sending church: ' +
      'here the disciples were first called "Christians" (Acts 11:26), and from its harbour at ' +
      'Seleucia, Paul and Barnabas set sail on the first missionary journey (Acts 13:1-4).',
    world:
      'Founded around 300 BC by Seleucus I and named for his father Antiochus, the city sat where ' +
      'the trade roads of Syria met the sea. Its suburb of Daphne was a pleasure-garden of springs ' +
      'and temples. A cosmopolitan mix of Greeks, Syrians, Jews and Romans made it the natural ' +
      'cradle for a faith that would cross every border.',
    event: { fx: 'commission', title: 'The Sending', big: '',
      lines: [
        'In the lamp-lit church the prophets fast and pray.',
        'The Spirit speaks: “Set apart for me Barnabas and Saul.”',
        'Hands are laid on them. The harbour gates open to the sea.',
      ] },
    relic: { name: 'The Commission of Antioch',
      found: 'You take up the elders’ blessing — your charge to sail.' },
    log: 'From Antioch we were sent out, the brothers laying hands on us at the harbour of Seleucia.',
  },
  {
    id: 'salamis', name: 'Salamis (Cyprus)', theme: 'cyprus',
    pos: [780, 120], radius: 150, landmark: 'harbor', order: 2,
    tagline: 'The first landfall — preaching in the synagogues of Cyprus.',
    history:
      'Salamis was the largest city and chief harbour of Cyprus, on the island\'s east coast, with ' +
      'a large Jewish population and several synagogues. Here Paul and Barnabas first proclaimed ' +
      'the word of God on Cyprus, with John Mark as their helper (Acts 13:5). Barnabas was himself ' +
      'a Cypriot Levite (Acts 4:36), returning now to his own people.',
    world:
      'The city boasted a vast gymnasium, marble baths, and a theatre seating 15,000. Its wealth ' +
      'came from copper — the very metal that gave Cyprus its name. Earthquakes and silting would ' +
      'later ruin the harbour, but in Paul\'s day it was the bustling gateway to the island.',
    event: { fx: 'commission', title: 'Into the Synagogues', big: '',
      lines: [
        'You come ashore where Barnabas was born.',
        'Synagogue by synagogue, the word goes out across Cyprus.',
        'John Mark carries the scrolls; the island leans in to listen.',
      ] },
    relic: { name: 'A Levite’s Blessing',
      found: 'Barnabas’ own people press a token of welcome into your hand.' },
    log: 'We made landfall at Salamis and preached the word of God in the synagogues of the Jews.',
  },
  {
    id: 'paphos', name: 'Paphos (Cyprus)', theme: 'cyprus',
    pos: [560, 200], radius: 150, landmark: 'temple', order: 3,
    tagline: 'A sorcerer struck blind, and a Roman governor believes.',
    history:
      'Paphos, on the south-west coast, was the Roman capital of Cyprus and a centre of the cult ' +
      'of Aphrodite, said to have risen from the sea nearby. Here Paul confronted the sorcerer ' +
      'Bar-Jesus (Elymas), who was struck blind, and the proconsul Sergius Paulus came to faith ' +
      '(Acts 13:6-12). From this point on, "Saul, who is also called Paul," takes the lead.',
    world:
      'Roman Paphos was rebuilt in marble after an earthquake by the emperor Augustus himself. ' +
      'Its governor held the rank of proconsul — a detail Luke gets exactly right, and one ' +
      'confirmed by inscriptions. Pilgrims flocked to the old sanctuary of Aphrodite up the coast.',
    event: { fx: 'blind', title: 'The Sorcerer Blinded', big: '',
      lines: [
        'Elymas the magician fights to turn the governor away.',
        'Paul fixes his eyes on him: “You will be blind, and not see the sun.”',
        'A mist falls over the sorcerer — and the proconsul believes.',
      ] },
    relic: { name: 'The Proconsul’s Seal',
      found: 'Sergius Paulus leaves his seal as a sign of his new faith.' },
    log: 'At Paphos the magician was struck blind, and the proconsul Sergius Paulus believed.',
  },
  {
    id: 'perga', name: 'Perga (Pamphylia)', theme: 'anatolia',
    pos: [470, -160], radius: 145, landmark: 'theater', order: 4,
    tagline: 'Landfall in Asia Minor — and a parting of ways.',
    history:
      'Perga lay on the fertile coastal plain of Pamphylia, a few miles up the Cestrus River, and ' +
      'was famous for its temple of Artemis. When the party reached Perga, John Mark left them and ' +
      'returned to Jerusalem (Acts 13:13) — a parting that would later cause a sharp dispute ' +
      'between Paul and Barnabas (Acts 15:37-39).',
    world:
      'Beyond Perga rose the Taurus Mountains, crossed by bandit-haunted passes climbing to the ' +
      'cool highlands. The lowland summers were fierce and malarial; some think this hard road, and ' +
      'the dangers ahead, were why young Mark turned back for home.',
    event: { fx: 'depart', title: 'John Mark Departs', big: '',
      lines: [
        'The mountain road ahead is steep and dangerous.',
        'John Mark looks back toward Jerusalem — and chooses home.',
        'Paul and Barnabas press on alone into the highlands.',
      ] },
    relic: { name: 'Mark’s Farewell Note',
      found: 'A note left behind by the departing John Mark.' },
    log: 'At Perga, John Mark left us and returned to Jerusalem, and we climbed into the mountains.',
  },
  {
    id: 'pisidian-antioch', name: 'Pisidian Antioch', theme: 'anatolia',
    pos: [430, -400], radius: 150, landmark: 'temple', order: 5,
    tagline: 'A great sermon in the synagogue — and the turn to the Gentiles.',
    history:
      'Pisidian Antioch sat on a plateau 3,600 feet up, a Roman colony of veterans astride the Via ' +
      'Sebaste. In its synagogue Paul preached one of his major recorded sermons (Acts 13:16-41). ' +
      'When crowds of Gentiles believed, jealous opposition drove the missionaries out, and they ' +
      '"shook the dust from their feet" (Acts 13:51).',
    world:
      'The colony was proudly Roman, modelled on the capital, with a temple to Augustus dominating ' +
      'its forum. Excavators found a fragment of the Res Gestae — the emperor\'s own record of his ' +
      'deeds — carved here. Into this monument of imperial power Paul proclaimed another King.',
    event: { fx: 'mob', title: 'The Turn to the Gentiles', big: '',
      lines: [
        'The whole city gathers to hear the word of the Lord.',
        'But jealousy boils over; the leaders stir up the crowd.',
        'Cast out, Paul shakes the dust from his feet and turns to the nations.',
      ] },
    relic: { name: 'The Sermon Scroll',
      found: 'A copy of the great synagogue sermon, hurriedly transcribed.' },
    log: 'At Pisidian Antioch we preached to Jew and Gentile alike, until they drove us from the city.',
  },
  {
    id: 'iconium', name: 'Iconium', theme: 'anatolia',
    pos: [630, -460], radius: 140, landmark: 'forum', order: 6,
    tagline: 'A divided city where signs and wonders were done.',
    history:
      'Iconium (modern Konya) was a prosperous city of Lycaonia at the edge of the vast Anatolian ' +
      'plain. Paul and Barnabas stayed "a long time, speaking boldly," and the Lord confirmed the ' +
      'message with signs and wonders (Acts 14:1-3). The city split in two, and a plot to stone ' +
      'them forced the apostles to flee to Lystra and Derbe (Acts 14:5-6).',
    world:
      'Watered by mountain streams, Iconium was a green island in a dry land — orchards and ' +
      'gardens ringed by the steppe. It sat on the road system that bound Asia Minor together, ' +
      'and it would remain a Christian centre for centuries after Paul.',
    event: { fx: 'mob', title: 'A City Divided', big: '',
      lines: [
        'Signs and wonders follow the bold preaching of the word.',
        'The city tears in two — some with the apostles, some against.',
        'Word comes of a plot to stone them. By night, they flee.',
      ] },
    relic: { name: 'Token of the Divided City',
      found: 'A token from the believers of a city split down the middle.' },
    log: 'At Iconium we spoke boldly, and the Lord did wonders — until a plot drove us out by night.',
  },
  {
    id: 'lystra', name: 'Lystra', theme: 'anatolia',
    pos: [740, -330], radius: 135, landmark: 'temple', order: 7,
    tagline: 'Mistaken for gods, then stoned — yet here a young Timothy waits.',
    history:
      'At Lystra Paul healed a man lame from birth, and the crowd, crying out in the Lycaonian ' +
      'tongue, took Barnabas for Zeus and Paul for Hermes and tried to sacrifice to them ' +
      '(Acts 14:8-18). Soon after, agitators stoned Paul and dragged him out for dead — yet he ' +
      'rose and went on. Lystra was the home of Timothy, who would become Paul\'s dearest ' +
      'companion (Acts 16:1-3).',
    world:
      'Lystra was a small Roman colony where Greek was a second language; the country folk still ' +
      'spoke Lycaonian, and local legend told that Zeus and Hermes had once walked there unknown — ' +
      'which is exactly why the crowd reacted as it did to two miracle-working strangers.',
    event: { fx: 'stones', title: 'Gods, Then Stones', big: 'ZEUS! HERMES!',
      lines: [
        'A lame man leaps up healed — the crowd roars in the Lycaonian tongue.',
        '“The gods have come down to us!” They bring oxen and garlands.',
        'Then enemies arrive. Stones fly. Paul is dragged out for dead — and rises.',
      ] },
    relic: { name: 'Timothy’s Pledge',
      found: 'A young disciple named Timothy vows to follow you. You keep his pledge.' },
    log: 'At Lystra they called us gods, then stoned me and left me for dead — yet I rose. Here we found Timothy.',
  },
  {
    id: 'derbe', name: 'Derbe', theme: 'anatolia',
    pos: [880, -380], radius: 130, landmark: 'forum', order: 8,
    tagline: 'The turning point — and the road home.',
    history:
      'Derbe was the easternmost town of the first journey, near the Roman frontier. Here the ' +
      'apostles "preached the gospel and made many disciples" (Acts 14:21) without any recorded ' +
      'opposition. From Derbe Paul turned back, retracing his steps to strengthen the young ' +
      'churches and appoint elders before sailing home to report all God had done.',
    world:
      'Derbe marked the edge of the settled Roman world; beyond lay the client kingdoms of the ' +
      'interior. Its exact site was unknown until a stone naming the city was found in the 1950s. ' +
      'For Paul it was the still point where the outward journey became the journey home.',
    event: { fx: 'commission', title: 'Many Disciples', big: '',
      lines: [
        'At last, a city that simply listens — and believes.',
        'Many become disciples in peace, without a single stone thrown.',
        'From here the road turns back, to strengthen all you have planted.',
      ] },
    relic: { name: 'The Roll of the Disciples',
      found: 'A roll listing the many disciples made at Derbe.' },
    log: 'At Derbe many believed, and we turned back to strengthen the souls of the disciples.',
  },
  {
    id: 'troas', name: 'Troas', theme: 'anatolia',
    pos: [150, 340], radius: 140, landmark: 'harbor', order: 9,
    tagline: 'A vision in the night: "Come over to Macedonia and help us."',
    history:
      'Alexandria Troas was a major port near the ruins of ancient Troy, the gateway between Asia ' +
      'and Europe. Here Paul saw a vision of a Macedonian man pleading, "Come over to Macedonia ' +
      'and help us" (Acts 16:9) — and the gospel crossed into Europe. Years later in Troas, the ' +
      'young Eutychus fell from a third-storey window during Paul\'s midnight sermon and was ' +
      'raised up (Acts 20:7-12).',
    world:
      'It is at Troas that Luke\'s narrative suddenly shifts to "we" — the physician himself ' +
      'joining the company. The city was a Roman colony with a fine artificial harbour; Julius ' +
      'Caesar and Constantine both reportedly toyed with making it an imperial capital.',
    event: { fx: 'vision', title: 'The Macedonian Vision', big: 'COME OVER AND HELP US',
      lines: [
        'Night falls on the harbour at the edge of Asia.',
        'In a dream a man of Macedonia stands and pleads:',
        '“Come over to Macedonia and help us.” At dawn, you sail for Europe.',
      ] },
    relic: { name: 'The Macedonian Call',
      found: 'You write down the night-vision before it fades — the call to Europe.' },
    log: 'At Troas a vision came in the night, and we set sail for Macedonia, sure God had called us.',
  },
  {
    id: 'philippi', name: 'Philippi', theme: 'greece',
    pos: [-60, 500], radius: 150, landmark: 'forum', order: 10,
    tagline: 'A riverside prayer, a jailbreak by earthquake, and the first European church.',
    history:
      'Philippi was a leading city of Macedonia and a proud Roman colony. By a riverside Paul met ' +
      'Lydia, a dealer in purple cloth — the first European convert (Acts 16:13-15). After casting ' +
      'a spirit from a slave girl, Paul and Silas were beaten and jailed; at midnight an earthquake ' +
      'shook the prison, and the jailer and his household believed (Acts 16:25-34).',
    world:
      'Named for Philip of Macedon, father of Alexander, the city stood near the gold mines of Mt. ' +
      'Pangaeus and on the great Via Egnatia. Its citizens prized their Roman status — which is why ' +
      'Paul\'s own Roman citizenship, revealed the next morning, left the magistrates terrified.',
    event: { fx: 'quake', title: 'Earthquake at Midnight', big: '',
      lines: [
        'Beaten and chained in the inner cell, Paul and Silas sing hymns.',
        'At midnight the earth heaves — every door bursts open, every chain falls.',
        'The jailer trembles: “What must I do to be saved?” That night, he believes.',
      ] },
    relic: { name: 'Letter to the Philippians',
      found: 'You recover a copy of the joyful letter to this beloved church.' },
    log: 'At Philippi we were beaten and jailed, but at midnight an earthquake freed us, and the jailer believed.',
  },
  {
    id: 'thessalonica', name: 'Thessalonica', theme: 'greece',
    pos: [-260, 380], radius: 150, landmark: 'forum', order: 11,
    tagline: 'They "turned the world upside down."',
    history:
      'Thessalonica was the capital and largest city of Macedonia, on the Via Egnatia with a fine ' +
      'harbour. Paul reasoned in the synagogue for three Sabbaths (Acts 17:1-4). A jealous mob ' +
      'dragged believers before the magistrates, charging that these men "who have turned the world ' +
      'upside down" defied Caesar by proclaiming another king, Jesus (Acts 17:6-7).',
    world:
      'Luke calls the city\'s rulers "politarchs" — an unusual title once doubted by scholars, ' +
      'until inscriptions bearing that exact word were dug up in Thessalonica itself. The city ' +
      'thrives still today, and Paul\'s two letters to it are among the earliest Christian writings.',
    event: { fx: 'mob', title: 'Turning the World Upside Down', big: 'ANOTHER KING — JESUS',
      lines: [
        'Three Sabbaths of reasoning win many — and enrage others.',
        'A mob storms the house: “These men have turned the world upside down!”',
        'The charge rings out: they proclaim another king, one Jesus.',
      ] },
    relic: { name: 'Letters to the Thessalonians',
      found: 'Two short letters of comfort and hope, copied for the road.' },
    log: 'At Thessalonica they cried that we had turned the world upside down, preaching another king.',
  },
  {
    id: 'berea', name: 'Berea', theme: 'greece',
    pos: [-380, 330], radius: 130, landmark: 'temple', order: 12,
    tagline: 'A noble-minded people who searched the Scriptures daily.',
    history:
      'Berea lay off the main road on the slopes of Mount Vermion. Luke calls the Bereans more ' +
      'noble-minded than the Thessalonians, for "they received the word with all eagerness, ' +
      'examining the Scriptures daily to see if these things were so" (Acts 17:11). Many believed — ' +
      'until opponents arrived from Thessalonica and Paul was sent on toward Athens.',
    world:
      'A quiet, prosperous town tucked against the mountains, Berea was the kind of place travellers ' +
      'passed through on the way to somewhere grander. Yet Luke singles out its people for the ' +
      'highest praise in all his journeys: they tested every word against the Scriptures.',
    event: { fx: 'debate', title: 'They Searched the Scriptures', big: '',
      lines: [
        'Here is a rarer thing than a riot: an open mind.',
        'Day by day the Bereans search the Scriptures to test the word.',
        'Many believe — until trouble follows from Thessalonica, and you move on.',
      ] },
    relic: { name: 'The Bereans’ Scroll',
      found: 'A well-worn scroll, marked by readers who tested every word.' },
    log: 'The Bereans were noble; they searched the Scriptures daily to see whether these things were so.',
  },
  {
    id: 'athens', name: 'Athens', theme: 'greece',
    pos: [-360, 60], radius: 165, landmark: 'acropolis', order: 13,
    tagline: 'On Mars Hill, declaring the "Unknown God" to the philosophers.',
    history:
      'Athens, though past its political prime, was still the intellectual heart of the Greek world, ' +
      'crowded with temples and idols. Provoked, Paul disputed with Epicurean and Stoic philosophers, ' +
      'who brought him to the Areopagus (Mars Hill). There he proclaimed the God they worshipped as ' +
      '"unknown," quoting their own poets: "In him we live and move and have our being" (Acts 17:16-34).',
    world:
      'Beneath the Acropolis and its Parthenon, the Agora swarmed with debate; the Athenians, Luke ' +
      'notes wryly, "spent their time in nothing but telling or hearing something new." Paul met ' +
      'them not with Scripture but with their own philosophers — and a few, like Dionysius, believed.',
    event: { fx: 'debate', title: 'On Mars Hill', big: 'TO AN UNKNOWN GOD',
      lines: [
        'A city full of idols — and one altar inscribed “To an Unknown God.”',
        'Before the philosophers of the Areopagus, Paul names that God.',
        '“In him we live and move and have our being.” Some mock; some believe.',
      ] },
    relic: { name: 'The Unknown God Inscription',
      found: 'You copy the altar inscription: TO AN UNKNOWN GOD.' },
    log: 'On Mars Hill I declared to the Athenians the God they worshipped without knowing.',
  },
  {
    id: 'corinth', name: 'Corinth', theme: 'greece',
    pos: [-480, 140], radius: 165, landmark: 'forum', order: 14,
    tagline: 'Eighteen months of teaching in a wealthy, restless port.',
    history:
      'Corinth controlled the narrow isthmus between two seas and grew immensely rich — and ' +
      'notoriously immoral. Here Paul met the tentmakers Aquila and Priscilla and stayed a year and ' +
      'a half (Acts 18:1-11). Dragged before the proconsul Gallio, the case was thrown out — and an ' +
      'inscription naming Gallio lets us date this moment to about AD 51-52.',
    world:
      'Ships were dragged bodily across the isthmus on a paved trackway, the diolkos, to avoid the ' +
      'deadly voyage round the cape. Corinth hosted the Isthmian Games, second only to Olympia. ' +
      'Its mixed crowd of sailors, traders and freedmen made Paul\'s church vibrant and turbulent.',
    event: { fx: 'appeal', title: 'Before Gallio', big: '',
      lines: [
        'In a city of sailors and wealth, Paul teaches a year and a half.',
        'His enemies haul him before Gallio, the Roman proconsul.',
        'Gallio refuses the case and drives them off. The work goes on, unhindered.',
      ] },
    relic: { name: 'Letters to the Corinthians',
      found: 'Two long, searching letters to a church Paul both loved and rebuked.' },
    log: 'At Corinth I stayed a year and a half, and before Gallio the charge against me collapsed.',
  },
  {
    id: 'ephesus', name: 'Ephesus', theme: 'anatolia',
    pos: [80, -180], radius: 175, landmark: 'temple', order: 15,
    tagline: 'Two years of ministry, and a riot of silversmiths crying "Great is Artemis!"',
    history:
      'Ephesus was the chief city of Asia and home to the Temple of Artemis, one of the Seven ' +
      'Wonders of the world. Paul taught here over two years, and "all who lived in Asia heard the ' +
      'word" (Acts 19:10). Miracles and the burning of magic books shook the city — until the ' +
      'silversmith Demetrius, fearing for his trade in silver shrines, sparked a riot in the great ' +
      'theatre (Acts 19:23-41).',
    world:
      'The theatre that filled with the chant still stands, carved into a hillside above the ' +
      'harbour road — it could hold 25,000. The Temple of Artemis was four times the size of the ' +
      'Parthenon. For two hours the crowd roared one cry, many not even knowing why they had come.',
    event: { fx: 'chant', title: 'Great Is Artemis!', big: 'GREAT IS ARTEMIS OF THE EPHESIANS!',
      lines: [
        'Demetrius the silversmith sees his idol-trade collapsing.',
        'The whole city rushes into the great theatre in fury.',
        'For two hours they roar with one voice, shaking the stone seats.',
      ] },
    relic: { name: 'Letter to the Ephesians',
      found: 'A copy of the soaring letter on the riches of grace.' },
    log: 'At Ephesus all Asia heard the word, until the silversmiths filled the theatre with their roar.',
  },
  {
    id: 'miletus', name: 'Miletus', theme: 'anatolia',
    pos: [60, -320], radius: 130, landmark: 'theater', order: 16,
    tagline: 'A farewell to the Ephesian elders, with tears on the shore.',
    history:
      'Miletus was an ancient and once-great Ionian port south of Ephesus. Hurrying to Jerusalem, ' +
      'Paul stopped here and sent for the elders of the Ephesian church, giving them a moving ' +
      'farewell: "I know that none of you... will see my face again." They wept, prayed on the ' +
      'beach, and walked him to the ship (Acts 20:17-38).',
    world:
      'Miletus had been the home of the first Greek philosophers — Thales, who measured the ' +
      'pyramids and predicted an eclipse. Its harbours were already silting up; today the ruins lie ' +
      'miles inland. On this fading shore Paul spoke the most tender goodbye in all of Acts.',
    event: { fx: 'farewell', title: 'Farewell on the Shore', big: '',
      lines: [
        'The elders of Ephesus come down to the beach at Miletus.',
        '“You will see my face no more,” Paul tells them. They weep aloud.',
        'They kneel together in the sand, and walk him to the waiting ship.',
      ] },
    relic: { name: 'The Elders’ Farewell',
      found: 'You keep the parting words spoken to the elders on the shore.' },
    log: 'At Miletus I bade the Ephesian elders farewell, and we knelt and wept together on the shore.',
  },
  {
    id: 'caesarea', name: 'Caesarea Maritima', theme: 'levant',
    pos: [1020, -140], radius: 155, landmark: 'harbor', order: 17,
    tagline: 'A gleaming harbour city — gateway of the gospel to the Gentiles.',
    history:
      'Caesarea, built by Herod the Great with a vast artificial harbour, was the seat of the Roman ' +
      'governors of Judea. Here the centurion Cornelius became the first Gentile convert (Acts 10). ' +
      'Paul was later held prisoner in Caesarea for two years, defending himself before the ' +
      'governors Felix and Festus and King Agrippa — until he appealed to Caesar (Acts 23-26).',
    world:
      'Herod\'s engineers sank shiploads of concrete into the sea to raise the harbour of Sebastos ' +
      'from open water — one of the wonders of ancient engineering. A stone found here bears the ' +
      'name of Pontius Pilate, the only physical inscription of him ever discovered.',
    event: { fx: 'appeal', title: 'I Appeal to Caesar', big: 'I APPEAL TO CAESAR!',
      lines: [
        'Two years a prisoner, Paul stands before Festus and King Agrippa.',
        'Almost persuaded, Agrippa hears the whole account of the road to Damascus.',
        'Paul claims his right as a Roman: “I appeal to Caesar!” To Rome he must go.',
      ] },
    relic: { name: 'The Appeal to Caesar',
      found: 'The record of the appeal that sets your course for Rome.' },
    log: 'At Caesarea I stood before Agrippa, and appealed to Caesar — so to Rome I was bound.',
  },
  {
    id: 'jerusalem', name: 'Jerusalem', theme: 'levant',
    pos: [1140, -300], radius: 170, landmark: 'temple', order: 18,
    tagline: 'The mother city — council, arrest, and the long road to Rome.',
    history:
      'Jerusalem, with its great Temple, was the heart of Jewish faith and the origin of the church. ' +
      'The Council of Jerusalem (Acts 15) decided that Gentile believers need not keep the whole Law ' +
      'of Moses. Returning later with a gift for the poor, Paul was seized in the Temple, nearly ' +
      'killed by a mob, and rescued by Roman soldiers (Acts 21) — beginning his road to Rome.',
    world:
      'Herod\'s Temple was one of the largest sacred complexes in the ancient world, its retaining ' +
      'walls — including the Western Wall — still standing today. A stone barrier warned Gentiles ' +
      'not to pass on pain of death; the mere rumour that Paul had brought a Greek inside set off ' +
      'the riot that changed his life.',
    event: { fx: 'mob', title: 'Seized in the Temple', big: '',
      lines: [
        'A rumour races through the Temple courts: he has defiled this place!',
        'The mob seizes Paul and drags him out to kill him.',
        'Roman soldiers crash through the crowd and carry him up the stairs alive.',
      ] },
    relic: { name: 'The Council’s Decree',
      found: 'The decree of the Jerusalem Council, opening the door to the nations.' },
    log: 'In Jerusalem a mob seized me in the Temple, and Roman soldiers bore me away alive.',
  },
  {
    id: 'malta', name: 'Malta', theme: 'italy',
    pos: [-780, -260], radius: 145, landmark: 'harbor', order: 19,
    tagline: 'Shipwrecked in a storm, yet not one life is lost.',
    history:
      'After a fierce two-week storm called the Euroclydon, Paul\'s prison ship ran aground on ' +
      'Malta, and all 276 aboard reached land safely (Acts 27). The islanders showed unusual ' +
      'kindness; when a viper fastened on Paul\'s hand and he shook it off unharmed, they were ' +
      'amazed. He healed the father of Publius, the chief official, and many more (Acts 28:1-11).',
    world:
      'Luke\'s account of the voyage — the soundings, the sea-anchor, the undergirding of the hull, ' +
      'the four anchors from the stern — is one of the most precise descriptions of ancient ' +
      'seafaring that survives. Sailors and scholars alike have traced the wreck to St. Paul\'s ' +
      'Bay on Malta\'s north coast.',
    event: { fx: 'snake', title: 'The Viper', big: '',
      lines: [
        '276 souls stagger ashore from the wreck; not one is lost.',
        'As Paul lays sticks on the fire, a viper strikes and hangs from his hand.',
        'He shakes it into the flames, unharmed. The islanders stand amazed.',
      ] },
    relic: { name: 'The Islanders’ Gift',
      found: 'A parting gift from the people of Malta, who supplied your every need.' },
    log: 'We were wrecked on Malta, yet all were saved; and the viper that struck me did me no harm.',
  },
  {
    id: 'rome', name: 'Rome', theme: 'italy',
    pos: [-1180, 220], radius: 200, landmark: 'forum', order: 20,
    tagline: 'The journey\'s end — preaching the kingdom in the capital of the world.',
    history:
      'Rome was the goal toward which all of Acts moves — "you must testify also in Rome" ' +
      '(Acts 23:11). Brought as a prisoner, Paul was met by believers at the Forum of Appius and ' +
      'lived two years under house arrest in his own rented lodging, "proclaiming the kingdom of God ' +
      'and teaching about the Lord Jesus Christ with all boldness and without hindrance" — the final ' +
      'words of Acts (Acts 28:30-31).',
    world:
      'The greatest city the world had yet seen, Rome held perhaps a million people, its grain ' +
      'shipped in from Egypt, its roads reaching every province. Acts ends not with Paul\'s death ' +
      'but with an open door: the gospel, having crossed the sea, now sounds out at the very ' +
      'heart of the empire — unhindered.',
    event: { fx: 'arrive', title: 'The Journey’s End', big: 'UNHINDERED',
      lines: [
        'Believers walk out to meet you at the Forum of Appius; you thank God and take courage.',
        'Even in chains, in your own rented house, the door stands open.',
        'You proclaim the kingdom of God boldly — and no one can hinder it.',
      ] },
    relic: { name: 'Letters from Prison',
      found: 'The prison letters — written in chains, full of light. Your voyage is complete.' },
    log: 'At Rome I preached the kingdom of God with all boldness, unhindered. The journey was complete.',
  },
];

export const JOURNEY_ORDER = TOWNS.slice().sort((a, b) => a.order - b.order).map(t => t.id);

// ----------------------------------------------------------------------------
//  Epistle puzzles — real verses from Paul's letters, reordered by the player
//  ("writing the letter"). Keep them short and recognisable.
// ----------------------------------------------------------------------------
export const EPISTLES = {
  derbe:        { ref: 'Galatians 5:1',        text: 'For freedom Christ has set us free' },
  philippi:     { ref: 'Philippians 4:4',      text: 'Rejoice in the Lord always and again rejoice' },
  berea:        { ref: '1 Thessalonians 5:21', text: 'Test everything and hold fast what is good' },
  corinth:      { ref: '1 Corinthians 13:4',   text: 'Love is patient and love is kind' },
  ephesus:      { ref: 'Ephesians 2:8',        text: 'By grace you have been saved through faith' },
  rome:         { ref: 'Romans 1:16',          text: 'I am not ashamed of the gospel' },
};

// ----------------------------------------------------------------------------
//  Spread the Light — towns where you bring the good news to a town by
//  lighting its lamps on foot. Value = how many lamps to light.
// ----------------------------------------------------------------------------
export const LIGHT_TOWNS = {
  antioch: 5, salamis: 5, iconium: 6, thessalonica: 6,
};
