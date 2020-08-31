---
layout: page
title: "Home"
class: home
---
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-145239790-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-145239790-1');
</script>


# Hi, I'm John Cobb

<div class="columns" markdown="1">

<div class="intro" markdown="1">
I'm a second year graduate student in the mathematics department at the [University of Wisconsin-Madison](https://www.math.wisc.edu/). I am supported by a [DoD NDSEG Fellowship](https://ndseg.sysplus.com/NDSEG/About/). My current research interests lie somewhere in the intersection of homological algebra and algebraic geometry. In 2019, I received my B.S. from the [Honors College of Charleston](https://honors.cofc.edu/), where I was advised by [Alex Kasman](http://kasmana.people.cofc.edu/) and [Amy Langville](http://langvillea.people.cofc.edu/). Details are in my [CV]({{ absolute_url }}/cv).
</div>

<div class="me" markdown="1">
<picture>
  <source srcset='/images/john_purple.webp' type='image/webp' />
  <img
    src='/images/john_purple.jpg'
    alt='John Cobb'/>
</picture>

{:.no-list}
* <a href="mailto:{{ site.email }}">{{ site.email }}</a>
</div>
</div>
<!--- Put stuff here when ready -->


## Featured Organization

<div class="featured-projects">
  {% assign sorted_projects = site.data.organization | concat: site.data.teaching | sort: 'highlight' %}
  {% for project in sorted_projects %}
    {% if project.highlight %}
      {% include project.html project=project %}
    {% endif %}
  {% endfor %}
</div>
<a href="{{ "/organization/" | relative_url }}" class="button">
  <i class="fas fa-chevron-circle-right"></i>
  Show More
</a>

## Featured Publications

<div class="featured-publications">
  {% for pub in site.data.publications %}
    {% if pub.highlight %}
      <a href="{{ pub.pdf }}" class="publication">
        <strong>{{ pub.title }}</strong>
        <span class="authors">{% for author in pub.authors %}{{ author }}{% unless forloop.last %}, {% endunless %}{% endfor %}</span>.
        <i>{{ pub.venue }}, {{ pub.year }}</i>.
        {% for award in pub.awards %}<br/><span class="award"><i class="fas fa-{% if award == "Best Paper Award" %}trophy{% else %}award{% endif %}" aria-hidden="true"></i> {{ award }}</span>{% endfor %}
      </a>
    {% endif %}
  {% endfor %}
</div>

<a href="{{ "/publications/" | relative_url }}" class="button">
  <i class="fas fa-chevron-circle-right"></i>
  Show All Publications
</a>

<div class="news-travel" markdown="1">

<div class="news" markdown="1">
## News

<ul>
{% for news in site.data.news limit:10 %}
  {% include news.html news=news %}
{% endfor %}
</ul>

</div>

<div class="travel" markdown="1">
## Travel

<table>
<tbody>
{% assign future_travel = site.data.travel | where_exp:'item','item.start == null' %}
{% for travel in future_travel %}
  {% include travel.html travel=travel %}
{% endfor %}
{% assign sorted_travel = site.data.travel | where_exp:'item','item.start' | sort: 'start' | reverse %}
{% for travel in sorted_travel limit:12 %}
  {% include travel.html travel=travel %}
{% endfor %}
</tbody>
</table>

</div>

</div>
