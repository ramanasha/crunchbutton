<?php

class Crunchbutton_Chart extends Cana_Model {

	public $activeUsersInterval = 45; // Days
	public $queryOnlyCommunties = 'AND c.id_community IN (1, 4)';
	public $queryExcludeCommunties = "AND c.name != 'Testing' AND c.name IS NOT NULL";
	public $queryExcludeUsers = "AND o.name NOT LIKE '%test%' and o.name != 'Judd' and o.name != 'dave' and o.name != 'Nick' and o.name != 'Devin'";

	public $from_month;
	public $to_month;
	public $from;
	public $to;
	public $weekFrom;
	public $weekTo;
	public $monthFrom;
	public $monthTo;

	public $chartId;

	public $groups = array();
	public $group = '';

	public function __construct() {
		
		$this->chartId = c::getPagePiece(2);

		$interval = ( $_REQUEST[ 'interval' ] ) ? $_REQUEST[ 'interval' ] : 'week';

		$this->activeUsersInterval = ( $_REQUEST[ 'activeUserDays' ] ? $_REQUEST[ 'activeUserDays' ] : $this->activeUsersInterval ); 

		$this->allDays = $this->allDays();
		$this->allWeeks = $this->allWeeks();
		$this->allMonths = $this->allMonths();

		switch ( $interval ) {

			case 'day':

				$this->from_day = ( $_REQUEST[ 'from' ] ? $_REQUEST[ 'from' ] : 1 ); 
				$this->from_day = ( ( $this->from_day  < 1 ) ? 1 : $this->from_day  );
				$this->to_day = ( $_REQUEST[ 'to' ] ? $_REQUEST[ 'to' ] : 1 ); 

				$this->dayFrom = $this->allDays[ $this->from_day  - 1 ];
				$this->dayTo = $this->allDays[ $this->to_day - 1 ];

				$this->from = array_search( $this->dayToWeek( $this->monthFrom ),  $this->allWeeks() );
				$this->to = array_search( $this->dayToWeek( $this->monthTo ),  $this->allWeeks() );

				break;

			case 'month':

				$this->from_month = ( $_REQUEST[ 'from' ] ? $_REQUEST[ 'from' ] : 1 ); 
				$this->from_month = ( ( $this->from_month  < 1 ) ? 1 : $this->from_month  );
				$this->to_month = ( $_REQUEST[ 'to' ] ? $_REQUEST[ 'to' ] : 1 ); 

				$this->monthFrom = $this->allMonths[ $this->from_month  - 1 ];
				$this->monthTo = $this->allMonths[ $this->to_month - 1 ];

				$this->from = array_search( $this->monthToWeek( $this->monthFrom ),  $this->allWeeks() );
				$this->to = array_search( $this->monthToWeek( $this->monthTo ),  $this->allWeeks() );

				break;
			
			case 'week':
			default:

				$this->from = ( $_REQUEST[ 'from' ] ? $_REQUEST[ 'from' ] : 1 ); 
				$this->from = ( ( $this->from  < 1 ) ? 1 : $this->from  );
				$this->to = ( $_REQUEST[ 'to' ] ? $_REQUEST[ 'to' ] : $this->totalWeeks() );

				$this->weekFrom = $this->allWeeks[ $this->from  - 1 ];
				$this->weekTo = $this->allWeeks[ $this->to - 1 ];

				$this->from_month = array_search( $this->weekToMonth( $this->weekFrom ), $this->allMonths() );
				$this->to_month = array_search( $this->weekToMonth( $this->weekTo ),  $this->allMonths() );

				$this->monthFrom = $this->allMonths()[ $this->from_month ];
				$this->monthTo = $this->allMonths[ $this->to_month ];

				$this->from_month++;
				$this->to_month++;

				$this->from_day = array_search( $this->weekToDay( $this->weekFrom ), $this->allDays() );
				$this->to_day = array_search( $this->weekToDay( $this->weekTo ),  $this->allDays() );

				if( $this->from_day ){
					$this->dayFrom = $this->allDays[ $this->from_day ];
					$this->from_day++;
				} else {
					$this->dayFrom = $this->allDays()[ 0 ];
					$this->from_day = 1;
				}

				if( $this->to_day ){
					$this->dayTo = $this->allDays[ $this->to_day ];
					$this->to_day++;
				} else {
					$this->dayTo = $this->allDays[ $this->totalDays() - 1 ];
					$this->to_day = $this->totalDays() + 1;
				}

				break;
		}
	}
	
	public function weeks(){
		$query = "SELECT COUNT( DISTINCT( YEARWEEK( date ) ) ) AS weeks FROM `order`";
		$result = c::db()->get( $query );
		return $result->_items[0]->weeks; 
	}

	public function allMonths(){
		if( !$this->_months ){
			$query = "SELECT DISTINCT( DATE_FORMAT( o.date ,'%Y-%m') ) month FROM `order` o WHERE o.date IS NOT NULL ORDER BY month ASC";
			$results = c::db()->get( $query );
			$months = array();
			foreach ( $results as $result ) {
				if( !$result->month ){
					continue;
				}
				$months[] = $result->month;
			}
			$this->_months = $months;
		}
		return $this->_months;
	}

	public function totalMonths(){
		$months = $this->allMonths();
		return sizeof( $months );
	}

	public function allDays(){
		$query = "SELECT DISTINCT( DATE_FORMAT( o.date ,'%Y-%m-%d') ) day FROM `order` o WHERE o.date IS NOT NULL ORDER BY day ASC";
		$results = c::db()->get( $query );
		$days = array();
		foreach ( $results as $result ) {
			if( !$result->day ){
				continue;
			}
			$days[] = $result->day;
		}
		return $days;
	}

	public function totalDays(){
		$days = $this->allDays();
		return sizeof( $days );
	}

	public function allWeeks(){
		if( !$this->_weeks ){
			$query = "SELECT DISTINCT( YEARWEEK( o.date ) ) week FROM `order` o WHERE YEARWEEK( o.date ) IS NOT NULL ORDER BY week ASC";
			$results = c::db()->get( $query );
			$weeks = array();
			foreach ( $results as $result ) {
				if( !$result->week ){
					continue;
				}
				$weeks[] = $result->week;
			}
			$this->_weeks = $weeks;
		}
		return $this->_weeks; 
	}

	public function totalWeeks(){
		$weeks = $this->allWeeks();
		return sizeof( $weeks );
	}

	public function weeksToJson(){
		$allWeeks = $this->allWeeks();
		$weeks = [];
		foreach( $allWeeks as $week ){
			$weeks[] = $this->parseWeek( $week, true );
		}
		return json_encode( $weeks );
	}

	public function weekToMonth( $week ){
		return date( 'Y-m', strtotime( 'sunday ' . substr( $week, 0, 4 ) . 'W' . substr( $week, 4, 2 ) ) );
	}

	public function weekToDay( $week, $day = 'first' ){
		$day = ( $day == 'first' ) ? '-0' : '-6';
		return date( 'Y-m-d', strtotime( substr( $week, 0, 4 ) . 'W' . substr( $week, 4, 2 ) . $day ) );
	}

	public function monthToWeek( $month ){
		return date( 'YW', strtotime( $month . '-01' ) );
	}

	public function dayToWeek( $day ){
		return date( 'YW', strtotime( $day ) );
	}

	public function getMonthsFromWeeks(){
		$months = [];
		$allWeeks = $this->allWeeks();
		for( $i = $this->from -1 ; $i < $this->to; $i++ ){
			$week = $allWeeks[ $i ];
			$month = date( 'Y-m', strtotime( substr( $week, 0, 4 ) . 'W' . substr( $week, 4, 2 ) ) );
			$months[ $month ] = $month;
		}
		return $months;
	}

	public function parseMonth( $month, $showYear = false ){
		$date = $month . '-01';
		$dateStr = ( $showYear ) ? 'M/y' : 'M';
		return date( $dateStr, strtotime( $date ) );
	}

	public function parseWeek( $week, $showYear = false ){
		$dateStr = ( $showYear ) ? 'M d Y' : 'M d';
		return date( $dateStr, strtotime( substr( $week, 0, 4 ) . 'W' . substr( $week, 4, 2 ) . '-0' ) );
	}

	public function parseDay( $day, $showYear = false ){
		$dateStr = ( $showYear ) ? 'M d Y' : 'M d';
		return date( $dateStr, strtotime( $day ) );
	}

	public function parseDataDaysSimple( $query, $type = 'Total' ){

		$data = c::db()->get( $query );

		$_days = [];
		foreach ( $data as $item ) {
			$_days[ $item->Day ] = $item->Total;
		}

		$allDays = $this->allDays();
		$data = [];
		for( $i = $this->from_day -1 ; $i < $this->to_day; $i++ ){
			$day = $allDays[ $i ];
			$total = ( $_days[ $day ] ) ? $_days[ $day ] : 0;
			$data[] = ( object ) array( 'Label' => $this->parseDay( $day ), 'Total' => $total, 'Type' => $type  ); 
		}
		return $data;
	}

	public function parseDataWeeksSimple( $query, $type = 'Total' ){

		$data = c::db()->get( $query );

		$_weeks = [];
		foreach ( $data as $item ) {
			$_weeks[ $item->Week ] = $item->Total;
		}

		$allWeeks = $this->allWeeks();

		$data = [];
		for( $i = $this->from -1 ; $i < $this->to; $i++ ){
			$week = $allWeeks[ $i ];
			$total = ( $_weeks[ $week ] ) ? $_weeks[ $week ] : 0;
			$data[] = ( object ) array( 'Label' => $this->parseWeek( $week ), 'Total' => $total, 'Type' => $type  ); 
		}

		return $data;
	}

	public function parseDataMonthSimple( $query, $type = 'Total' ){
		
		$data = c::db()->get( $query );

		$_months = [];
		foreach ( $data as $item ) {
			$_months[ $item->Month ] = $item->Total;
		}

		$allMonths = $this->allMonths();

		$data = [];
		for( $i = $this->from_month -1 ; $i < $this->to_month; $i++ ){
			$month = $allMonths[ $i ];
			$total = ( $_months[ $month ] ) ? $_months[ $month ] : 0;
			$data[] = ( object ) array( 'Label' => $this->parseMonth( $month, true ), 'Total' => $total, 'Type' => $type  ); 
		}

		return $data;
	}

	public function parseDataDaysGroup( $query ){

		$data = c::db()->get( $query );

		$_days = [];
		$groups = [];

		foreach ( $data as $item ) {
			$groups[ $item->Group ] = $item->Group;
			$_days[ $item->Day ][ $item->Group ] = $item->Total;
		}

		$data = [];

		$allDays = $this->allDays();

		for( $i = $this->from_day -1 ; $i < $this->to_day; $i++ ){
			$days = $allDays[ $i ];
			foreach( $groups as $group ){
				$total = ( $_days[ $days ][ $group ] ) ? $_days[ $days ][ $group ] : 0;
				$data[] = ( object ) array( 'Label' => $this->parseDay( $days ), 'Total' => $total, 'Type' => $group  ); 
			}
		}
		return $data;
	}

	public function parseDataWeeksGroup( $query ){
		$data = c::db()->get( $query );

		$_weeks = [];
		$groups = [];
		foreach ( $data as $item ) {
			$groups[ $item->Group ] = $item->Group;
			$_weeks[ $item->Week ][ $item->Group ] = $item->Total;
		}

		$data = [];

		$allWeeks = $this->allWeeks();

		for( $i = $this->from -1 ; $i < $this->to; $i++ ){
			$week = $allWeeks[ $i ];
			foreach( $groups as $group ){
				$total = ( $_weeks[ $week ][ $group ] ) ? $_weeks[ $week ][ $group ] : 0;
				$data[] = ( object ) array( 'Label' => $this->parseWeek( $week ), 'Total' => $total, 'Type' => $group  ); 
			}
		}
		return $data;
	}

	public function parseDataMonthGroup( $query ){

		$data = c::db()->get( $query );

		$_months = [];
		$groups = [];
		foreach ( $data as $item ) {
			$groups[ $item->Group ] = $item->Group;
			$_months[ $item->Month ][ $item->Group ] = $item->Total;
		}

		$data = [];

		$allMonths = $this->allMonths();

		for( $i = $this->from -1 ; $i < $this->to; $i++ ){
			$month = $allMonths[ $i ];
			foreach( $groups as $group ){
				$total = ( $_months[ $month ][ $group ] ) ? $_months[ $month ][ $group ] : 0;
				$data[] = ( object ) array( 'Label' => $this->parseMonth( $month, true ), 'Total' => $total, 'Type' => $group  ); 
			}
		}
		return $data;
	}

	public function getGroupedCharts(){
		return $this->groups[ $this->group ];
	}
}