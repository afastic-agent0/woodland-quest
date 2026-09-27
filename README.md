# Cybersecurities — Woodland Quest

Julkaistu 26.9.2026 osoitteessa https://www.cybersecurities.cloud/. Julkinen HTTPS, julkaisutiedostojen vastaavuus, suojausotsakkeet ja vastauksen säilyminen sivun päivityksen jälkeen on tarkistettu. Katso `../Julkaisun-perustarkistus.md`.

## Käynnistys

Avaa komentorivi tässä kansiossa ja suorita:

```text
python -m http.server 8766 --bind 127.0.0.1
```

Avaa selaimessa http://127.0.0.1:8766/. Jos esikatselu on jo käynnissä, käytä olemassa olevaa osoitetta. JavaScript-moduulit tarvitsevat HTTP-palvelimen: pelkkä index.html-tiedoston kaksoisnapsautus ei riitä. Pythonia tarvitaan vain tähän paikalliseen esikatseluun; tavallinen verkkopalvelin voi tarjoilla valmiin sivuston ilman Pythonia tai Nodea.

## Toteutettu

- Englanninkielinen peli, 8 tasoa ja 8 yksilöllistä kysymystä per taso.
- Tasot noudattavat CISSP:n kahdeksan domainin järjestystä. Jokaisella tasolla 2 AI-kysymystä: yhteensä 16.
- Vain oikein ratkaistu tehtävä avaa seuraavan lukon. Kahdeksan lukkoa avaa seuraavan tason.
- Väärän vastauksen jälkeen saa yrittää uudelleen. Ratkaistuista tasoista voi lukea vastaukset ja selitykset.
- XP: 100 oikein ensimmäisellä yrityksellä, −30 kutakin väärää valintaa kohden, −20 käytetystä vihjeestä, vähintään 10 ratkaistusta lukosta.
- Patch ja Glitch ovat alkuperäiset sarjakuvahahmot. Patch antaa tehtäväkohtaisia vihjeitä, Glitch reagoi vääriin vastauksiin ja molemmat juhlivat tason valmistumista.
- Nimimerkit, vastaukset, aikaleimat, vihjeet ja edistyminen tallennetaan selaimen paikalliseen IndexedDB-tietokantaan.
- Vastaushistorian JSON-vienti. Tässä versiossa ei ole JSON-tuontia.
- Näppäimet 1–4, responsiivinen näkymä, näppäimistökäyttö ja vähennetyn liikkeen asetus.

## Mitä paikallinen tietokanta tarkoittaa

Tietokannan nimi on `cyber-signal-local`, versio 1. Taulut (IndexedDB object stores):

| Taulu | Sisältö |
| --- | --- |
| profiles | Nimimerkin normalisoitu avain, näyttönimi, kysymysversion tunniste, ratkaistut tehtävät, väärät vaihtoehdot, vihjeet, pisteet, luonti- ja päivitysaika |
| answers | Erillinen rivi jokaisesta hyväksytystä vastausyrityksestä: profiili, tehtävä, taso, valinta, vastausteksti, oikeellisuus, pisteet, vihjeen käyttö, yritysnumero ja aikaleima |

Vastaus ja sen edistymismuutos kirjoitetaan yhdessä readwrite-transaktiossa. Samanaikaiset vastaukset samaan jo ratkaistuun kysymykseen eivät tuplaa pisteitä. Virheellinen tai tulevan tason vastaus ei muuta tietoja. Tallennusvirhe näytetään käyttäjälle; peli ei ilmoita onnistunutta tallennusta ennen transaktion valmistumista.

`localStorage` säilyttää vain viimeksi syötetyn nimimerkin käyttöliittymäasetuksena. Varsinaiset vastaukset ovat IndexedDB:ssä.

Nimimerkki ei ole autentikointi. Samalla selaimella sama nimimerkki avaa samat paikalliset tulokset. Eri selaimella sama nimi aloittaa erillisen profiilin. Ei palvelinpuolen tulosrekisteriä, salasanoja, analytiikkaa, evästeseurantaa tai kutsuja AI-palveluun. Kysymykset ja oikeat vastaukset toimitetaan selaimelle; tämä on oppimispeli, ei valvottu koe tai väärentämätön kilpailujärjestelmä.

Sivuston osoite rajaa tietokannan: localhost, cybersecurities.cloud ja www.cybersecurities.cloud ovat eri alkuperiä. Tulokset eivät siirry niiden välillä automaattisesti. Myös sivustodatan tyhjentäminen tai selaimen tallennustilan poistaminen voi poistaa tulokset. JSON-vienti on varmuuskopio; siirtyessä domainille voidaan toteuttaa hallittu tuonti tai yhteinen palvelintietokanta erikseen.

## Siirto omaan verkkotunnukseen

Valmis `cyber-signal-site.zip` sisältää julkaistavat staattiset tiedostot. Paketin juuressa on index.html. Säilytä kansiorakenne, erityisesti assets/crew.png. Kaikki pelin resurssit ladataan samasta osoitteesta, eikä CDN:ää tai API-avaimia tarvita.

Seuraavassa vaiheessa selvitetään nykyinen webhotelli tai hosting-palvelu ja haluttu polku. Esimerkiksi `/play/` toimii suhteellisten tiedostoviittausten ansiosta. DNS:n hallinta ja sivuston hosting ovat eri asioita: pelkkä domainin omistus ei kerro, miten palvelimelle julkaistaan. Älä korvaa nykyistä etusivua ennen kuin julkaisupaikka on sovittu.

Tavallisen staattisen hostingin tulee tarjoilla .js-tiedostot JavaScript-MIME-tyypillä, sallia sivuston oma JavaScript ja käyttää HTTPS:ää. Käytä yhtä kanonista domainia, jotta pelaajien tallennukset eivät jakaudu www- ja ei-www-osoitteiden kesken. Jos myöhemmin halutaan yhteinen tuloslista, ylläpitäjän näkymä tai laitteiden välinen jatkaminen, tarvitaan palvelinrajapinta ja tietokanta; nykyinen versio ei väitä tarjoavansa niitä.

## Sisältö ja lähteet

Tehtävät ovat tätä peliä varten kirjoitettuja alkuperäisiä harjoituksia. CISSP-rakenne on aiheiden kartta, ei lupaus virallisen kokeen kattavuudesta tai sen läpäisemisestä. Pelissä jokainen aihealue saa 8 kysymystä; tämä ei vastaa tutkinnon painotettua kysymysjakaumaa.

- [ISC2: CISSP outline](https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline) — kahdeksan aihealuetta ja AI:n sisältyminen niihin.
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) — yleinen lisälukeminen kyberturvallisuuden hallintaan.
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) — AI-riskien hallinta ja arviointi.
- [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/) — AI-tehtävien lisälukeminen: prompt injection, tiedon paljastuminen, poisoning, liialliset toimivaltuudet, tulosteiden käsittely ja resurssien käyttö.

## Kuvitus

Tiedosto: `assets/crew.png`. Luotu built-in image_gen -työkalulla, ei API/CLI-fallbackilla. Yksi kuva, kaksi hahmoa; puhekuplat ja reaktiot toteutetaan pelin käyttöliittymässä. Hahmot eivät ole keskustelevia kielimalleja.

Lopullinen kuvaprompti:

> Use case: illustration-story. Wide landscape 2:1 raster mascot asset for a cybersecurity quiz game. Two original friendly comic robot mascots side by side. Left: Patch, an upbeat security guide robot with lime accents and a warm, confident smile. Right: Glitch, a mischievous small bug-like robot with periwinkle accents and a playful expressive face. Solid navy #10131c background. Bold clean comic linework, polished cel shading, expressive faces. Patch entirely in left half centered at 25% width; Glitch entirely in right half centered at 75%. Fully visible upper bodies including heads, arms, hands; generous margins and no crossing midpoint. Similar visual scale for separate CSS portrait crops. Palette #10131c, #baff52, #8eacff, pale neutral highlights. Exactly two robots; no words, names, letters, numbers, captions, logos, watermark, panels, borders or interface chrome.

## Tarkistukset

`node tests.mjs` tarkistaa 64 kysymystä, aihejaon, pisteytyksen, kaikki tasorajat, virheelliset vastaukset, vihjeet, uudelleenyritykset ja tallennetun tilan jatkamisen.

`storage-test.html` on paikallinen kehittäjätesti. Se luo erillisiä QA-profiileja ja tarkistaa IndexedDB:llä atomiset tallennukset, samanaikaisen kaksoisvastauksen, epäonnistuneen transaktion, historian viennin ja nimimerkkien erottelun. Testi ei kuulu julkaistavaan ZIP-pakettiin.

Selainvarmistuksessa koko 64 tehtävän kampanja pelattiin loppuun. Lisäksi tarkistettiin sivun uudelleenlatauksen yli jatkuva peli, vihje, väärä vastaus, tietokannan vienti, WebMCP:n kelvollinen ja virheellinen syöte sekä mobiilinäkymä. Testiprofiilit käyttävät QA-alkuisia nimiä eivätkä sisälly julkaistavaan pakettiin.


## Woodland-loppuruudun esikatselu

Paikallinen osoite: `http://127.0.0.1:8766/?preview=finale`. Näyttää saman loppuruudun kuin kaikkien 64 kysymyksen ratkaiseminen, mutta esimerkkituloksilla. Esikatselu ei avaa eikä muuta IndexedDB-tietokantaa. Varsinainen loppuruutu käyttää pelaajan omia pisteitä, tarjoaa vastaushistorian viennin ja paluun kyliin. Viimeisestä valmiista kylästä juhlaruudun voi avata uudelleen. Metsämaailma ja loppuruutu sisältyvät nyt tarkistettuun julkaisupakettiin. Versio on julkaistu ja julkinen palvelu tarkistettu 26.9.2026. Julkinen nimi on Cybersecurities — Woodland Quest; sisäiset tallennustunnisteet on säilytetty. Katso outputs/Julkaisun-perustarkistus.md.
