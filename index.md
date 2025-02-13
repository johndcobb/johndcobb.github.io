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
I am a NSF postdoctoral fellow with [Hal Schenck](http://webhome.auburn.edu/~hks0015/) at Auburn University. I received my PhD from the mathematics department at the [University of Wisconsin-Madison](https://www.math.wisc.edu/) in May 2024, where I was advised by both [Daniel Erman](https://math.hawaii.edu/~erman) and [Michael Kemeny](https://people.math.wisc.edu/~kemeny/homepage.html). From 2019 to 2022, I was supported by a [DoD NDSEG Fellowship](https://ndseg.sysplus.com/NDSEG/About/). Details are in my [CV]({{ absolute_url }}/cv).

My research interests are primarily within algebraic geometry and commutative algebra. My work involves syzygies, toric varieties, defining equations of curves, and more recently, applications to algebraic statistics.
</div>

<div class="me" markdown="1">
<picture>
  <source srcset='/images/john_green.webp' type='image/webp' />
  <img
    src='/images/john_green.jpg'
    alt='John Cobb'/>
</picture>

{:.no-list}
* <i class="fa-solid fa-envelope" aria-hidden="true"></i> <a href="mailto:{{ site.email }}">{{ site.email }}</a>
* <i class="fas fa-map-marker-alt" aria-hidden="true"></i> <a href="https://maps.app.goo.gl/HKbrYNAp16UTkw4a6">Extension Hall</a>, Office 204A
</div>
</div>
<!--- Put stuff here when ready -->

<!---
## Featured Organizing

<div class="featured-projects">
  {% assign sorted_projects = site.data.organizing | concat: site.data.teaching | sort: 'highlight' %}
  {% for project in sorted_projects %}
    {% if project.highlight %}
      {% include project.html project=project %}
    {% endif %}
  {% endfor %}
</div>
<a href="{{ "/teaching/" | relative_url }}" class="button">
  <i class="fas fa-chevron-circle-right" aria-hidden="true"></i>
  Show More
</a>
-->

## Featured Publications

<div class="featured-publications">
  {% assign sorted_publications = site.data.publications | sort: 'year' | reverse %}
  {% for pub in sorted_publications %}
    {% if pub.highlight %}
      {% if pub.pdf %}
        <a href="{{ pub.pdf }}" class="publication">
          <strong>{{ pub.title }}</strong>
          <span class="authors">{% for author in pub.authors %}{{ author }}{% unless forloop.last %}, {% endunless %}{% endfor %}</span>.
          <i>{% if pub.venue %} {{  pub.venue }}, {% endif %} {{ pub.year }}</i>.
          {% for award in pub.awards %}<br/><span class="award"><i class="fas fa-{% if award == "Best Paper Award" %}trophy{% else %}award{% endif %}" aria-hidden="true"></i> {{ award }}</span>{% endfor %}
        </a>
      {% else %}
        <div class="publication">
          <strong>{{ pub.title }}</strong>
          <span class="authors">{% for author in pub.authors %}{{ author }}{% unless forloop.last %}, {% endunless %}{% endfor %}</span>.
          <i>{% if pub.venue %} {{  pub.venue }}, {% endif %} {{ pub.year }}</i>.
          {% for award in pub.awards %}<br/><span class="award"><i class="fas fa-{% if award == "Best Paper Award" %}trophy{% else %}award{% endif %}" aria-hidden="true"></i> {{ award }}</span>{% endfor %}
        </div>
      {% endif %}
    {% endif %}
  {% endfor %}
</div>

<a href="{{ "/publications/" | relative_url }}" class="button">
  <i class="fas fa-chevron-circle-right" aria-hidden="true"></i>
  Show All Publications
</a>

<div class="news-travel" markdown="1">

<div class="news" markdown="1">
## Latest News

<ul>
{% for news in site.data.news limit:5 %}
  {% include news.html news=news %}
{% endfor %}
</ul>
[(see all)]({{ absolute_url }}/news) 

</div>

<div class="travel" markdown="1">
## Latest Travel

<table>
<tbody>
{% assign future_travel = site.data.travel | where_exp:'item','item.start == null' %}
{% for travel in future_travel %}
  {% include travel.html travel=travel %}
{% endfor %}
{% assign sorted_travel = site.data.travel | where_exp:'item','item.start' | sort: 'start' | reverse %}
{% for travel in sorted_travel limit: 8 %}
  {% include travel.html travel=travel %}
{% endfor %}
</tbody>
</table>
[(see all)]({{ absolute_url }}/travel) 

</div>

</div>
