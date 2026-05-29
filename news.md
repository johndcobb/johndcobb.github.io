---
layout: page
permalink: /news/
title: News
class: home
---

# News

<div class="news" markdown="1">

<ul>
{% for news in site.data.news %}
  {% include news.html news=news %}
{% endfor %}
</ul>

</div>
