<?php
declare(strict_types=1);
function validate_catalog(mixed $data): void {
    if(!$data instanceof stdClass||($data->schemaVersion??null)!==1||!is_array($data->courses??null)||count($data->courses)<1||count($data->courses)>200)fail('Ungültiger EBL-Katalog.');
    $ids=[];
    $identify=function($o)use(&$ids){if(!$o instanceof stdClass||!is_string($o->id??null)||!preg_match('/^[a-zA-Z0-9_-]{1,100}$/D',$o->id)||isset($ids[$o->id])||!is_string($o->title??null)||!trim($o->title)||mb_strlen($o->title)>250)fail('Titel oder eindeutige ID ist ungültig.');$ids[$o->id]=true;};
    foreach($data->courses as $c){$identify($c);if(!is_array($c->modules??null)||count($c->modules)>100)fail('Ungültige Module.');
        foreach($c->modules as $m){$identify($m);if(!is_array($m->lessons??null)||count($m->lessons)>200)fail('Ungültige Lektionen.');
            foreach($m->lessons as $l){$identify($l);if(!is_string($l->content??null)||mb_strlen($l->content)>100000)fail('Ungültiger Lektionstext.');
                if(isset($l->flashcards)){if(!is_array($l->flashcards)||count($l->flashcards)>500)fail('Ungültige Karteikarten.');foreach($l->flashcards as $f)if(!is_string($f->q??null)||!is_string($f->a??null))fail('Karteikarten benötigen q und a.');}
                if(isset($l->quiz)){
                    $quiz=$l->quiz;$questions=$quiz->questions??null;
                    if(!is_array($questions)||count($questions)>100||!is_int($quiz->passingScore??null)||$quiz->passingScore<1||$quiz->passingScore>count($questions))fail('Ungültiger Wissenscheck oder passingScore.');
                    foreach($questions as $q){$identify($q);if(!in_array($q->type??null,['single','multiple'],true)||!is_array($q->answers??null)||count($q->answers)<2||count($q->answers)>10)fail('Ungültiger Fragetyp oder Antworten.');$correct=0;$answers=[];
                        foreach($q->answers as $a){if(!is_string($a->id??null)||isset($answers[$a->id])||!is_string($a->text??null)||!trim($a->text)||!is_bool($a->isCorrect??null))fail('Ungültige Antwort.');$answers[$a->id]=true;if($a->isCorrect)$correct++;}
                        if(!$correct||($q->type==='single'&&$correct!==1))fail('Falsche Anzahl korrekter Antworten.');
                    }
                }
            }
        }
    }
}
function validate_state(mixed $s): void {
    if(!$s instanceof stdClass)fail('Ungültiger Lernstand.');
    foreach(['completed','quizResults','notes','reviews'] as $key)if(!(($s->$key??null) instanceof stdClass))fail('Ungültiger Lernstand: '.$key);
    foreach(['tasks','bookmarks','activity'] as $key)if(!is_array($s->$key??null)||count($s->$key)>2000)fail('Ungültiger Lernstand: '.$key);
    foreach($s->completed as $id=>$value)if(!is_bool($value))fail('Ungültiger Fortschritt.');
    foreach($s->notes as $id=>$value)if(!is_string($value)||mb_strlen($value)>20000)fail('Notizen müssen Text mit maximal 20.000 Zeichen sein.');
    foreach($s->tasks as $t)if(!is_string($t->id??null)||!is_string($t->title??null)||mb_strlen($t->title)>250||!is_bool($t->done??null)||!is_string($t->date??null))fail('Ungültige Aufgabe.');
    foreach($s->bookmarks as $b)if(!is_string($b->title??null)||!is_string($b->url??null))fail('Ungültige Leseliste.');
    foreach($s->reviews as $r)if(!$r instanceof stdClass||!is_numeric($r->due??null)||!is_numeric($r->interval??null)||!is_numeric($r->reviews??null))fail('Ungültige Kartenbewertung.');
    if(isset($s->lastLesson)&&!is_string($s->lastLesson))fail('Ungültige zuletzt gelesene Lektion.');
    if(strlen(json_encode($s))>1048576)fail('Der persönliche Lernstand ist zu groß (maximal 1 MB).',413);
}
