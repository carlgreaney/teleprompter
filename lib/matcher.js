/* Speech-to-script matcher. Pure logic, no DOM, no network.
   createMatcher(scriptWords) where scriptWords = normalised words ('' for punctuation-only tokens).
   m.feed(spokenWords)  -> spokenWords is the normalised transcript of the CURRENT recognition session
   (cumulative; interim words may be re-sent). Returns true if the position moved.
   Rules: position only ever moves forward; ad-libs (words not in the script) are ignored;
   skipped sentences are recovered by a phrase (bigram/trigram) search ahead. */
(function (root) {
  var STOP = new Set(('a an the and or but of to in on at is it i you we he she they that this with for as be are was were so if then ' +
    'um uh er ah like just very really well okay ok yeah').split(' '));
  function createMatcher(words) {
    var m = { pos: 0, processed: 0, words: words };
    function skipEmpty() { while (m.pos < words.length - 1 && !words[m.pos]) m.pos++; }
    skipEmpty();
    m.reset = function (p) { m.pos = p || 0; m.processed = 0; skipEmpty(); };
    m.setPos = function (p, sessionLen) { m.pos = Math.max(0, Math.min(words.length, p)); m.processed = sessionLen || 0; };
    function find(w, from, to) { for (var j = from; j < Math.min(words.length, to); j++) if (words[j] === w) return j; return -1; }
    m.feed = function (spoken) {
      if (spoken.length < m.processed) m.processed = 0;       // new session / shorter revision
      var moved = false;
      for (var k = m.processed; k < spoken.length; k++) {
        var w = spoken[k]; if (!w) continue;
        var w2 = spoken[k + 1] || null, w3 = spoken[k + 2] || null, hit = -1;
        // 1. next few words: accept a plain match
        hit = find(w, m.pos, m.pos + 4);
        // 2. a little further: needs a content word, or the following word agrees too
        if (hit < 0) {
          var j = find(w, m.pos + 4, m.pos + 12);
          if (j >= 0 && ((w.length >= 4 && !STOP.has(w)) || (w2 && words[j + 1] === w2))) hit = j;
        }
        // 3. skipped a sentence or two: phrase search ahead (two words, at least one meaningful; or three words)
        if (hit < 0 && w2) {
          for (var s = m.pos; s < Math.min(words.length - 1, m.pos + 250); s++) {
            if (words[s] !== w || words[s + 1] !== w2) continue;
            var meaningful = !(STOP.has(w) && STOP.has(w2));
            if (meaningful || (w3 && words[s + 2] === w3)) { hit = s; break; }
          }
        }
        if (hit >= 0 && hit >= m.pos - 0) { m.pos = hit + 1; moved = true; skipEmpty(); }
      }
      m.processed = spoken.length;
      return moved;
    };
    return m;
  }
  var api = { createMatcher: createMatcher };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KaraokeMatcher = api;
})(typeof self !== 'undefined' ? self : this);
