import { createApp } from 'vue'
import App from './App.vue'

import { Quasar } from 'quasar'
import quasarLang from 'quasar/lang/tr' // Türkçe dil desteği
import '@quasar/extras/material-icons/material-icons.css' // İkon seti
import 'quasar/src/css/index.sass' // Quasar CSS dosyası

const app = createApp(App)

app.use(Quasar, {
  plugins: {}, // Quasar pluginlerini buraya ekleyebilirsiniz
  lang: quasarLang
})

app.mount('#app')
