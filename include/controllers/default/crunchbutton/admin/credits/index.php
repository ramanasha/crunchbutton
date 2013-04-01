<?php

class Controller_Admin_Credits extends Crunchbutton_Controller_Account {
	public function init() {
		c::view()->page = 'admin/credits';
		c::view()->layout('layout/admin');
		if( c::getPagePiece(2) == 'new' ){ 
			$id_user = $_GET[ 'id_user' ];
			if( $id_user != '' ){
				$user = Crunchbutton_User::o( $id_user );
				if( $user->id_user ){
					c::view()->user = $user;
				} else {
					c::view()->user = false;
				}
			} else {
				c::view()->user = false;
			}
			if( $_GET[ 'id_restaurant' ] != '' ){ 
				$id_restaurant = $_GET[ 'id_restaurant' ];
			} else {
				$id_restaurant = false;
			}
			c::view()->id_restaurant = $id_restaurant;
			c::view()->users = Crunchbutton_User::q('SELECT u.id_user, u.name, u.phone, u.email FROM user u INNER JOIN user_auth ua ON ua.id_user = u.id_user WHERE u.active = 1 ORDER BY u.name ASC');;
			c::view()->display('admin/credits/new');	
		} else {
			$credit = Crunchbutton_Credit::o(c::getPagePiece(2));
			if( $credit->id_credit ){
				c::view()->credit = $credit;
				c::view()->display('admin/credits/credit');	
			} else {
				// Show the credit's list
				c::view()->display('admin/credits/index');
			}
		}
	}
}