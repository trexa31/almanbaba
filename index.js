export default {
  async fetch(request) {
    return new Response("Merhaba Dünya! Worker çalışıyor. 🎉", {
      headers: { "content-type": "text/plain" },
    });
  },
};
